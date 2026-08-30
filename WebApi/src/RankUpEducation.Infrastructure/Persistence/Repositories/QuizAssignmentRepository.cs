using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Lookups;
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
        IReadOnlyList<long>? studentIds,
        long? assignedByUserId,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.QuizAssignments.AsNoTracking()
            .Where(assignment => assignment.QuizId == quizId);
        query = ApplyStudentScope(query, studentIds, assignedByUserId);

        var assignments = await query
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

        var assignmentStudentIds = assignments.Select(item => item.StudentId).Distinct().ToList();
        var attemptRows = await _dbContext.QuizAttempts.AsNoTracking()
            .Where(attempt => attempt.QuizId == quizId && assignmentStudentIds.Contains(attempt.StudentId))
            .OrderBy(attempt => attempt.StudentId)
            .ThenBy(attempt => attempt.AttemptNumber)
            .ThenBy(attempt => attempt.StartedDate)
            .ToListAsync(cancellationToken);

        var attemptStatusIds = attemptRows.Select(attempt => attempt.StatusId).Distinct().ToList();
        var attemptStatusNames = attemptStatusIds.Count == 0
            ? new Dictionary<short, string>()
            : await _dbContext.Lookups.AsNoTracking()
                .Where(lookup => attemptStatusIds.Contains(lookup.Id))
                .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);

        var attemptsByStudent = attemptRows
            .GroupBy(attempt => attempt.StudentId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<QuizAssignmentAttemptItem>)group
                    .Select(attempt => new QuizAssignmentAttemptItem(
                        attempt.Id,
                        attempt.AttemptNumber,
                        attempt.StartedDate,
                        ResolveAttemptSubmittedAt(attempt),
                        attemptStatusNames.GetValueOrDefault(attempt.StatusId, "Unknown")))
                    .ToArray());

        var items = new List<QuizAssignmentListItem>();
        foreach (var assignment in assignments)
        {
            var attempts = attemptsByStudent.GetValueOrDefault(
                assignment.StudentId,
                Array.Empty<QuizAssignmentAttemptItem>());

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
                attempts.Count,
                assignment.AssignedById,
                assignment.CreatedDate,
                attempts,
                assignment.AssignedByRole));
        }

        return items;
    }

    private static DateTimeOffset? ResolveAttemptSubmittedAt(QuizAttempt attempt)
    {
        if (attempt.StatusId is LookupNames.QuizAttemptStatusIds.Started
            or LookupNames.QuizAttemptStatusIds.InProgress)
        {
            return null;
        }

        // Begin() copies StartedDate onto SubmittedDate until the student actually submits.
        if (attempt.SubmittedDate <= attempt.StartedDate)
        {
            return null;
        }

        return attempt.SubmittedDate;
    }

    public async Task<int> RemoveFutureAssignmentsAsync(
        long quizId,
        DateTimeOffset now,
        long assignedByUserId,
        CancellationToken cancellationToken)
    {
        var assignments = await _dbContext.QuizAssignments
            .Where(assignment =>
                assignment.QuizId == quizId
                && assignment.AssignedById == assignedByUserId
                && assignment.StartDateTime > now)
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

    public async Task<IReadOnlyList<QuizAssignment>> GetAssignmentEntitiesForStudentsAsync(
        long quizId,
        IReadOnlyList<long> studentIds,
        CancellationToken cancellationToken)
    {
        if (studentIds.Count == 0)
        {
            return Array.Empty<QuizAssignment>();
        }

        return await _dbContext.QuizAssignments
            .Where(assignment => assignment.QuizId == quizId && studentIds.Contains(assignment.StudentId))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<QuizAssignmentBoardItem>> ListAssignmentBoardAsync(
        IReadOnlyList<long>? studentIds,
        long? assignedByUserId,
        long? studentId,
        CancellationToken cancellationToken)
    {
        var assignmentQuery = ApplyStudentScope(
            _dbContext.QuizAssignments.AsNoTracking(),
            studentIds,
            assignedByUserId);

        var query =
            from assignment in assignmentQuery
            join quiz in _dbContext.Quizzes.AsNoTracking() on assignment.QuizId equals quiz.Id
            where quiz.IsActive && !quiz.IsDeleted
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
                stats.LastSubmittedAt,
                stats.LastAttemptId,
                row.assignment.AssignedByRole));
        }

        return items;
    }

    public async Task<QuizAssignmentAccess?> GetAssignmentAccessAsync(
        long quizId,
        long studentId,
        CancellationToken cancellationToken)
    {
        var existing = await _dbContext.QuizAssignments.AsNoTracking()
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

        if (existing is not null)
        {
            return existing;
        }

        var quiz = await _dbContext.Quizzes.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == quizId && item.IsActive && !item.IsDeleted, cancellationToken);
        if (quiz is null
            || quiz.AudienceStartAt is null
            || quiz.AudienceEndAt is null
            || quiz.AudienceAllowedAttempts is null
            || !quiz.AudienceScope.Equals("Public", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var studentUser = await _dbContext.Users.AsNoTracking()
            .FirstOrDefaultAsync(user => user.Id == studentId, cancellationToken);
        if (studentUser is null)
        {
            return null;
        }

        var attemptCount = await _dbContext.QuizAttempts.AsNoTracking()
            .CountAsync(attempt => attempt.QuizId == quizId && attempt.StudentId == studentId, cancellationToken);

        // AssignmentId 0 signals public catalog access without a materialized row yet.
        return new QuizAssignmentAccess(
            0,
            quiz.Id,
            studentId,
            quiz.AudienceStartAt.Value,
            quiz.AudienceEndAt.Value,
            quiz.AudienceAllowedAttempts.Value,
            attemptCount);
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

    public async Task<QuizAssignmentLifecycleMaintenanceResult> ExpireOverdueUnattemptedAsync(
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var changed = 0;
        var newlyOpenedSurprise = new List<QuizAssignmentOpenedNotice>();

        var dueUpcoming = await (
            from assignment in _dbContext.QuizAssignments
            join quiz in _dbContext.Quizzes on assignment.QuizId equals quiz.Id
            where assignment.QuizResultStatus == LookupNames.QuizResultStatusIds.Upcoming
                && assignment.StartDateTime <= now
                && assignment.EndDateTime >= now
                && !_dbContext.QuizAttempts.Any(attempt =>
                    attempt.QuizId == assignment.QuizId && attempt.StudentId == assignment.StudentId)
            select new { assignment, quiz }).ToListAsync(cancellationToken);

        foreach (var row in dueUpcoming)
        {
            row.assignment.SetResultStatus(LookupNames.QuizResultStatusIds.NotAttempted);
            changed++;

            if (row.quiz.QuizTypeId == LookupNames.QuizTypeIds.Surprise)
            {
                newlyOpenedSurprise.Add(new QuizAssignmentOpenedNotice(
                    row.quiz.Id,
                    row.quiz.QuizTitle,
                    row.assignment.StudentId));
            }
        }

        var overdueUnattempted = await _dbContext.QuizAssignments
            .Where(assignment =>
                assignment.EndDateTime < now
                && (assignment.QuizResultStatus == LookupNames.QuizResultStatusIds.NotAttempted
                    || assignment.QuizResultStatus == LookupNames.QuizResultStatusIds.Upcoming)
                && !_dbContext.QuizAttempts.Any(attempt =>
                    attempt.QuizId == assignment.QuizId && attempt.StudentId == assignment.StudentId))
            .ToListAsync(cancellationToken);

        foreach (var assignment in overdueUnattempted)
        {
            assignment.SetResultStatus(LookupNames.QuizResultStatusIds.Expired);
            changed++;
        }

        return new QuizAssignmentLifecycleMaintenanceResult(changed, newlyOpenedSurprise);
    }

    private static IQueryable<QuizAssignment> ApplyStudentScope(
        IQueryable<QuizAssignment> query,
        IReadOnlyList<long>? studentIds,
        long? assignedByUserId)
    {
        if (studentIds is null)
        {
            return query;
        }

        if (assignedByUserId is not null)
        {
            return query.Where(assignment =>
                studentIds.Contains(assignment.StudentId)
                || assignment.AssignedById == assignedByUserId.Value);
        }

        return query.Where(assignment => studentIds.Contains(assignment.StudentId));
    }
}
