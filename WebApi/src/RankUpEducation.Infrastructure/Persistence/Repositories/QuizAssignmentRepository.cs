using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

/// <summary>Assignment CRUD, access windows, review state, and assignment board queries.</summary>
public sealed class QuizAssignmentRepository : IQuizAssignmentRepository
{
    private readonly RankUpDbContext _dbContext;

    public QuizAssignmentRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAssignmentsAsync(IReadOnlyList<QuizAssignment> assignments, CancellationToken cancellationToken)
    {
        await _dbContext.QuizAssignments.AddRangeAsync(assignments, cancellationToken);
    }

    public async Task<IReadOnlyList<QuizAssignmentListItem>> ListAssignmentsForQuizAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var assignments = await _dbContext.QuizAssignments.AsNoTracking()
            .Where(assignment => assignment.QuizId == quizId)
            .OrderBy(assignment => assignment.StartDateTime)
            .ToListAsync(cancellationToken);

        if (assignments.Count == 0)
        {
            return Array.Empty<QuizAssignmentListItem>();
        }

        var resultStatusNames = await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => assignments.Select(item => item.QuizResultStatus).Contains(lookup.Id))
            .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);

        var studentNames = await QuizQueryHelper.LoadStudentNamesAsync(
            _dbContext,
            assignments.Select(item => item.StudentId),
            cancellationToken);

        var items = new List<QuizAssignmentListItem>();
        foreach (var assignment in assignments)
        {
            var attemptCount = await _dbContext.QuizAttempts.AsNoTracking()
                .CountAsync(
                    attempt => attempt.QuizId == quizId && attempt.StudentId == assignment.StudentId,
                    cancellationToken);

            items.Add(new QuizAssignmentListItem(
                assignment.Id,
                assignment.StudentId,
                studentNames.GetValueOrDefault(assignment.StudentId, $"Student {assignment.StudentId}"),
                assignment.StudentGroupId,
                assignment.StartDateTime,
                assignment.EndDateTime,
                assignment.AllowedAttempts,
                assignment.QuizResultStatus,
                resultStatusNames.GetValueOrDefault(assignment.QuizResultStatus, "Unknown"),
                assignment.IsReviewDone,
                attemptCount));
        }

        return items;
    }

    public async Task<int> RemoveFutureAssignmentsAsync(long quizId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var assignments = await _dbContext.QuizAssignments
            .Where(assignment => assignment.QuizId == quizId && assignment.StartDateTime > now)
            .ToListAsync(cancellationToken);

        if (assignments.Count == 0)
        {
            return 0;
        }

        _dbContext.QuizAssignments.RemoveRange(assignments);
        return assignments.Count;
    }

    public Task<bool> AssignmentExistsAsync(long quizId, long studentId, CancellationToken cancellationToken)
    {
        return _dbContext.QuizAssignments.AsNoTracking()
            .AnyAsync(assignment => assignment.QuizId == quizId && assignment.StudentId == studentId, cancellationToken);
    }

    public async Task<IReadOnlyList<QuizAssignmentBoardItem>> ListAssignmentBoardForCreatorAsync(
        long creatorUserId,
        long? studentId,
        CancellationToken cancellationToken)
    {
        var creatorKey = creatorUserId.ToString();
        var query =
            from assignment in _dbContext.QuizAssignments.AsNoTracking()
            join quiz in _dbContext.Quizzes.AsNoTracking() on assignment.QuizId equals quiz.Id
            where quiz.CreatedByName == creatorKey && quiz.IsActive && !quiz.IsDeleted
            select new { assignment, quiz };

        if (studentId is not null)
        {
            query = query.Where(row => row.assignment.StudentId == studentId.Value);
        }

        var rows = await query.OrderByDescending(row => row.assignment.StartDateTime).ToListAsync(cancellationToken);
        if (rows.Count == 0)
        {
            return Array.Empty<QuizAssignmentBoardItem>();
        }

        var resultStatusNames = await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => rows.Select(row => row.assignment.QuizResultStatus).Contains(lookup.Id))
            .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);

        var studentNames = await QuizQueryHelper.LoadStudentNamesAsync(
            _dbContext,
            rows.Select(row => row.assignment.StudentId),
            cancellationToken);

        var items = new List<QuizAssignmentBoardItem>();
        foreach (var row in rows)
        {
            var stats = await QuizQueryHelper.GetAttemptStatsAsync(
                _dbContext,
                row.quiz.Id,
                row.assignment.StudentId,
                cancellationToken);
            items.Add(new QuizAssignmentBoardItem(
                row.assignment.Id,
                row.quiz.Id,
                row.quiz.QuizTitle,
                row.assignment.StudentId,
                studentNames.GetValueOrDefault(row.assignment.StudentId, $"Student {row.assignment.StudentId}"),
                row.assignment.StartDateTime,
                row.assignment.EndDateTime,
                row.assignment.AllowedAttempts,
                stats.AttemptCount,
                row.assignment.IsReviewDone,
                resultStatusNames.GetValueOrDefault(row.assignment.QuizResultStatus, "Unknown"),
                stats.LastSubmittedAt));
        }

        return items;
    }

    public Task<QuizAssignmentAccess?> GetAssignmentAccessAsync(
        long quizId,
        long studentId,
        CancellationToken cancellationToken)
    {
        return _dbContext.QuizAssignments.AsNoTracking()
            .Where(assignment => assignment.QuizId == quizId && assignment.StudentId == studentId)
            .Select(assignment => new QuizAssignmentAccess(
                assignment.Id,
                assignment.QuizId,
                assignment.StudentId,
                assignment.StartDateTime,
                assignment.EndDateTime,
                assignment.AllowedAttempts,
                _dbContext.QuizAttempts.Count(attempt => attempt.QuizId == quizId && attempt.StudentId == studentId)))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<QuizAssignment?> GetAssignmentEntityAsync(long quizId, long studentId, CancellationToken cancellationToken)
    {
        return _dbContext.QuizAssignments
            .FirstOrDefaultAsync(item => item.QuizId == quizId && item.StudentId == studentId, cancellationToken);
    }

    public Task<QuizAssignment?> GetAssignmentEntityByIdAsync(
        long assignmentId,
        long quizId,
        CancellationToken cancellationToken)
    {
        return _dbContext.QuizAssignments
            .FirstOrDefaultAsync(
                assignment => assignment.Id == assignmentId && assignment.QuizId == quizId,
                cancellationToken);
    }

    public async Task<QuizAssignmentReviewState?> GetAssignmentReviewStateAsync(
        long quizId,
        long studentId,
        CancellationToken cancellationToken)
    {
        return await (
            from assignment in _dbContext.QuizAssignments.AsNoTracking()
            join quiz in _dbContext.Quizzes.AsNoTracking() on assignment.QuizId equals quiz.Id
            where assignment.QuizId == quizId && assignment.StudentId == studentId
            select new QuizAssignmentReviewState(
                assignment.Id,
                assignment.IsReviewDone,
                quiz.IsReviewRequired))
            .FirstOrDefaultAsync(cancellationToken);
    }
}
