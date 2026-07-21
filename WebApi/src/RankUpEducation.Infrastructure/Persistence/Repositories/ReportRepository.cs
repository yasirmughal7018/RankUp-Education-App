using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Application.Reports;
using RankUpEducation.Contracts.Reports;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

/// <inheritdoc cref="RankUpEducation.Application.Reports.IReportRepository"/>
public sealed class ReportRepository : IReportRepository
{
    private readonly RankUpDbContext _dbContext;

    public ReportRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<QuizSummaryReportResponse> GetQuizSummaryAsync(
        int? schoolId,
        int? campusId,
        long? creatorUserId,
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken)
    {
        var quizzes = _dbContext.Quizzes.AsNoTracking()
            .Where(quiz => quiz.IsActive && !quiz.IsDeleted);

        if (schoolId is not null)
        {
            quizzes = quizzes.Where(quiz => quiz.SchoolId == schoolId.Value);
        }

        if (campusId is not null)
        {
            quizzes = quizzes.Where(quiz => quiz.SchoolCampusId == campusId.Value);
        }

        if (creatorUserId is not null)
        {
            var creatorKey = creatorUserId.Value.ToString();
            quizzes = quizzes.Where(quiz => quiz.CreatedByName == creatorKey);
        }

        var quizList = await quizzes.Select(quiz => new { quiz.Id, quiz.LifecycleStatusId }).ToListAsync(cancellationToken);
        var quizIds = quizList.Select(quiz => quiz.Id).ToArray();

        var publishedLifecycleIds = await QuizQueryHelper.ResolveStatusIdsByNamesAsync(
            _dbContext,
            "QuizLifecycleStatus",
            ["Published", "Assigned"],
            cancellationToken);

        var assignments = await _dbContext.QuizAssignments.AsNoTracking()
            .Where(assignment => quizIds.Contains(assignment.QuizId))
            .ToListAsync(cancellationToken);

        if (from is not null)
        {
            assignments = assignments.Where(item => item.StartDateTime >= from.Value).ToList();
        }

        if (to is not null)
        {
            assignments = assignments.Where(item => item.StartDateTime <= to.Value).ToList();
        }

        var attempts = await _dbContext.QuizAttempts.AsNoTracking()
            .Where(attempt => quizIds.Contains(attempt.QuizId) && attempt.SubmittedDate != default)
            .ToListAsync(cancellationToken);

        var pendingReviews = assignments.Count(item => !item.IsReviewDone && attempts.Any(attempt =>
            attempt.QuizId == item.QuizId && attempt.StudentId == item.StudentId));

        return new QuizSummaryReportResponse(
            quizList.Count,
            quizList.Count(quiz => publishedLifecycleIds.Contains(quiz.LifecycleStatusId)),
            assignments.Count,
            attempts.Count,
            pendingReviews,
            assignments.Count(item => item.IsReviewDone),
            attempts.Count == 0 ? null : (short)Math.Round(attempts.Average(item => item.Percentage)));
    }

    public async Task<QuizPerformanceReportResponse?> GetQuizPerformanceAsync(
        long quizId,
        int? schoolId,
        int? campusId,
        long? creatorUserId,
        CancellationToken cancellationToken)
    {
        var quizQuery = _dbContext.Quizzes.AsNoTracking()
            .Where(quiz => quiz.Id == quizId && quiz.IsActive && !quiz.IsDeleted);

        if (schoolId is not null)
        {
            quizQuery = quizQuery.Where(quiz => quiz.SchoolId == schoolId.Value);
        }

        if (campusId is not null)
        {
            quizQuery = quizQuery.Where(quiz => quiz.SchoolCampusId == campusId.Value);
        }

        if (creatorUserId is not null)
        {
            var creatorKey = creatorUserId.Value.ToString();
            quizQuery = quizQuery.Where(quiz => quiz.CreatedByName == creatorKey);
        }

        var quiz = await quizQuery.FirstOrDefaultAsync(cancellationToken);
        if (quiz is null)
        {
            return null;
        }

        var assignments = await _dbContext.QuizAssignments.AsNoTracking()
            .Where(assignment => assignment.QuizId == quizId)
            .ToListAsync(cancellationToken);

        var studentNames = await QuizQueryHelper.LoadStudentNamesAsync(
            _dbContext,
            assignments.Select(item => item.StudentId),
            cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var students = new List<QuizPerformanceStudentResponse>();
        foreach (var assignment in assignments)
        {
            var stats = await QuizQueryHelper.GetAttemptStatsAsync(
                _dbContext,
                quizId,
                assignment.StudentId,
                cancellationToken);

            students.Add(new QuizPerformanceStudentResponse(
                assignment.StudentId,
                studentNames.GetValueOrDefault(assignment.StudentId, $"Student {assignment.StudentId}"),
                stats.AttemptCount,
                stats.BestPercentage,
                assignment.IsReviewDone,
                QuizStatusCalculator.ResolveMonitorStatus(
                    now,
                    assignment.StartDateTime,
                    assignment.EndDateTime,
                    stats.AttemptCount,
                    assignment.IsReviewDone,
                    stats.LastSubmittedAt)));
        }

        var percentages = students
            .Where(item => item.BestPercentage is not null)
            .Select(item => item.BestPercentage!.Value)
            .ToArray();

        return new QuizPerformanceReportResponse(
            quiz.Id,
            quiz.QuizTitle,
            (short)students.Count,
            (short)students.Count(item => item.AttemptCount > 0),
            (short)students.Count(item => item.Status == "pending_review"),
            (short)students.Count(item => item.IsReviewDone),
            percentages.Length == 0 ? null : (short)Math.Round(percentages.Average(value => value)),
            students);
    }

    public async Task<StudentQuizHistoryResponse> GetStudentQuizHistoryAsync(
        long studentId,
        CancellationToken cancellationToken)
    {
        var studentName = await _dbContext.Users.AsNoTracking()
            .Where(user => user.Id == studentId)
            .Select(user => user.FullName)
            .FirstOrDefaultAsync(cancellationToken)
            ?? $"Student {studentId}";

        var rows = await (
            from assignment in _dbContext.QuizAssignments.AsNoTracking()
            join quiz in _dbContext.Quizzes.AsNoTracking() on assignment.QuizId equals quiz.Id
            where assignment.StudentId == studentId && quiz.IsActive && !quiz.IsDeleted
            orderby assignment.StartDateTime descending
            select new { assignment, quiz }).ToListAsync(cancellationToken);

        var resultStatusNames = await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => rows.Select(row => row.assignment.QuizResultStatus).Contains(lookup.Id))
            .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);

        var items = new List<StudentQuizHistoryItemResponse>();
        foreach (var row in rows)
        {
            var stats = await QuizQueryHelper.GetAttemptStatsAsync(
                _dbContext,
                row.quiz.Id,
                studentId,
                cancellationToken);

            var latestAttemptId = await _dbContext.QuizAttempts.AsNoTracking()
                .Where(attempt => attempt.QuizId == row.quiz.Id && attempt.StudentId == studentId)
                .OrderByDescending(attempt => attempt.SubmittedDate)
                .Select(attempt => (long?)attempt.Id)
                .FirstOrDefaultAsync(cancellationToken);

            items.Add(new StudentQuizHistoryItemResponse(
                row.quiz.Id,
                row.quiz.QuizTitle,
                latestAttemptId,
                (short)stats.AttemptCount,
                stats.BestPercentage,
                resultStatusNames.GetValueOrDefault(row.assignment.QuizResultStatus, "Unknown"),
                row.assignment.IsReviewDone,
                stats.LastSubmittedAt));
        }

        return new StudentQuizHistoryResponse(studentId, studentName, items);
    }

    public async Task<RankingReportResponse> GetRankingsAsync(
        long? quizId,
        int? schoolId,
        int? campusId,
        long? creatorUserId,
        CancellationToken cancellationToken)
    {
        var quizzes = _dbContext.Quizzes.AsNoTracking()
            .Where(quiz => quiz.IsActive && !quiz.IsDeleted);

        if (quizId is not null)
        {
            quizzes = quizzes.Where(quiz => quiz.Id == quizId.Value);
        }

        if (schoolId is not null)
        {
            quizzes = quizzes.Where(quiz => quiz.SchoolId == schoolId.Value);
        }

        if (campusId is not null)
        {
            quizzes = quizzes.Where(quiz => quiz.SchoolCampusId == campusId.Value);
        }

        if (creatorUserId is not null)
        {
            var creatorKey = creatorUserId.Value.ToString();
            quizzes = quizzes.Where(quiz => quiz.CreatedByName == creatorKey);
        }

        var quizRows = await quizzes.Select(quiz => new { quiz.Id, quiz.QuizTitle }).ToListAsync(cancellationToken);
        var quizIds = quizRows.Select(quiz => quiz.Id).ToArray();
        var title = quizId is not null
            ? quizRows.FirstOrDefault()?.QuizTitle ?? "Quiz rankings"
            : "School quiz rankings";

        if (quizIds.Length == 0)
        {
            return new RankingReportResponse(quizId, title, Array.Empty<RankingItemResponse>());
        }

        var attemptRows = await _dbContext.QuizAttempts.AsNoTracking()
            .Where(attempt => quizIds.Contains(attempt.QuizId) && attempt.SubmittedDate != default)
            .GroupBy(attempt => attempt.StudentId)
            .Select(group => new
            {
                StudentId = group.Key,
                BestPercentage = group.Max(item => item.Percentage),
                AttemptCount = group.Count()
            })
            .OrderByDescending(item => item.BestPercentage)
            .ThenBy(item => item.StudentId)
            .Take(50)
            .ToListAsync(cancellationToken);

        var names = await QuizQueryHelper.LoadStudentNamesAsync(
            _dbContext,
            attemptRows.Select(item => item.StudentId),
            cancellationToken);

        var items = attemptRows
            .Select((item, index) => new RankingItemResponse(
                index + 1,
                item.StudentId,
                names.GetValueOrDefault(item.StudentId, $"Student {item.StudentId}"),
                item.BestPercentage,
                item.AttemptCount))
            .ToArray();

        return new RankingReportResponse(quizId, title, items);
    }
}
