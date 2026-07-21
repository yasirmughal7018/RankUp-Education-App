using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

/// <summary>
/// Quiz persistence: role-scoped lists, approval queue, creator detail, and lifecycle guard queries.
/// </summary>
public sealed class QuizRepository : IQuizRepository
{
    private readonly RankUpDbContext _dbContext;
    private readonly ILookupRepository _lookups;

    public QuizRepository(RankUpDbContext dbContext, ILookupRepository lookups)
    {
        _dbContext = dbContext;
        _lookups = lookups;
    }

    public Task<IReadOnlyList<QuizListItem>> ListForStudentAsync(
        long studentId,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken)
    {
        return ListFromAssignmentsAsync(
            _dbContext.QuizAssignments.Where(assignment => assignment.StudentId == studentId),
            search,
            subject,
            grade,
            studentId,
            cancellationToken);
    }

    public Task<IReadOnlyList<QuizListItem>> ListForLinkedStudentsAsync(
        IReadOnlyList<long> studentIds,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken)
    {
        if (studentIds.Count == 0)
        {
            return Task.FromResult<IReadOnlyList<QuizListItem>>(Array.Empty<QuizListItem>());
        }

        return ListFromAssignmentsAsync(
            _dbContext.QuizAssignments.Where(assignment => studentIds.Contains(assignment.StudentId)),
            search,
            subject,
            grade,
            null,
            cancellationToken);
    }

    public async Task<IReadOnlyList<QuizListItem>> ListForTeacherAsync(
        long teacherUserId,
        int schoolId,
        int campusId,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Quizzes.AsNoTracking()
            .Where(quiz => quiz.SchoolId == schoolId
                && quiz.SchoolCampusId == campusId
                && quiz.IsActive
                && !quiz.IsDeleted);

        query = QuizQueryHelper.ApplyQuizFilters(query, search, subject, grade);
        var quizzes = await query.ToListAsync(cancellationToken);
        var lookupNames = await QuizQueryHelper.LoadLookupNamesAsync(_dbContext, quizzes, cancellationToken);
        var schools = await QuizQueryHelper.LoadSchoolNamesAsync(
            _dbContext,
            quizzes.Select(quiz => quiz.SchoolId).Distinct(),
            cancellationToken);

        var items = new List<QuizListItem>();
        foreach (var quiz in quizzes)
        {
            var item = QuizQueryHelper.MapQuizWithoutAssignment(
                quiz,
                lookupNames,
                schools,
                attemptCount: 0,
                bestPercentage: null,
                lastSubmittedAt: null,
                quiz.LifecycleStatusId,
                lookupNames.GetValueOrDefault(quiz.LifecycleStatusId, "Unknown"));
            if (QuizQueryHelper.MatchesFilters(item, search, subject, grade))
            {
                items.Add(item);
            }
        }

        return items;
    }

    public async Task<IReadOnlyList<QuizListItem>> ListForSchoolAsync(
        int? schoolId,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Quizzes.AsNoTracking()
            .Where(quiz => quiz.IsActive && !quiz.IsDeleted);

        if (schoolId is not null)
        {
            query = query.Where(quiz => quiz.SchoolId == schoolId.Value);
        }

        query = QuizQueryHelper.ApplyQuizFilters(query, search, subject, grade);
        var quizzes = await query.ToListAsync(cancellationToken);
        var lookupNames = await QuizQueryHelper.LoadLookupNamesAsync(_dbContext, quizzes, cancellationToken);
        var schools = await QuizQueryHelper.LoadSchoolNamesAsync(
            _dbContext,
            quizzes.Select(quiz => quiz.SchoolId).Distinct(),
            cancellationToken);

        return quizzes
            .Select(quiz => QuizQueryHelper.MapQuizWithoutAssignment(
                quiz,
                lookupNames,
                schools,
                0,
                null,
                null,
                quiz.LifecycleStatusId,
                lookupNames.GetValueOrDefault(quiz.LifecycleStatusId, "Unknown")))
            .ToArray();
    }

    public async Task<IReadOnlyList<PendingQuizApprovalItem>> ListPendingApprovalAsync(
        int? schoolId,
        CancellationToken cancellationToken)
    {
        var pendingIds = await QuizQueryHelper.ResolveStatusIdsByNamesAsync(
            _dbContext,
            QuizLookupNames.QuizApprovalStatus,
            QuizLookupNames.PendingApprovalStatusNames,
            cancellationToken);

        if (pendingIds.Count == 0)
        {
            return Array.Empty<PendingQuizApprovalItem>();
        }

        var parentPrivateTypeIds = await QuizQueryHelper.ResolveStatusIdsByNamesAsync(
            _dbContext,
            QuizLookupNames.QuizType,
            QuizLookupNames.ParentPrivateQuizTypeNames,
            cancellationToken);

        var query = _dbContext.Quizzes.AsNoTracking()
            .Where(quiz =>
                quiz.IsActive &&
                !quiz.IsDeleted &&
                pendingIds.Contains(quiz.ApprovalStatusId));

        if (schoolId is not null)
        {
            query = query.Where(quiz => quiz.SchoolId == schoolId.Value);
        }

        if (parentPrivateTypeIds.Count > 0)
        {
            query = query.Where(quiz => !parentPrivateTypeIds.Contains(quiz.QuizTypeId));
        }

        var quizzes = await query
            .OrderByDescending(quiz => quiz.ModifiedDate)
            .ThenByDescending(quiz => quiz.Id)
            .ToListAsync(cancellationToken);

        if (quizzes.Count == 0)
        {
            return Array.Empty<PendingQuizApprovalItem>();
        }

        var lookupNames = await QuizQueryHelper.LoadLookupNamesAsync(_dbContext, quizzes, cancellationToken);
        var approvalIds = quizzes.Select(quiz => quiz.ApprovalStatusId).Distinct().ToArray();
        var approvalNames = await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => approvalIds.Contains(lookup.Id))
            .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);
        var schools = await QuizQueryHelper.LoadSchoolNamesAsync(
            _dbContext,
            quizzes.Select(quiz => quiz.SchoolId).Distinct(),
            cancellationToken);

        return quizzes
            .Select(quiz => new PendingQuizApprovalItem(
                quiz.Id,
                quiz.QuizTitle,
                quiz.CreatedByName,
                schools.GetValueOrDefault(quiz.SchoolId, "School"),
                lookupNames.GetValueOrDefault(quiz.SubjectId, "Subject"),
                lookupNames.GetValueOrDefault(quiz.ClassId, "Grade"),
                lookupNames.GetValueOrDefault(quiz.QuizTypeId, "Quiz"),
                approvalNames.GetValueOrDefault(quiz.ApprovalStatusId, "Pending"),
                lookupNames.GetValueOrDefault(quiz.LifecycleStatusId, "Unknown"),
                quiz.TotalQuestions,
                quiz.ModifiedDate ?? DateOnly.FromDateTime(DateTime.UtcNow)))
            .ToArray();
    }

    public async Task<QuizDetailItem?> GetDetailForStudentAsync(
        long quizId,
        long studentId,
        CancellationToken cancellationToken)
    {
        var assignment = await _dbContext.QuizAssignments.AsNoTracking()
            .FirstOrDefaultAsync(item => item.QuizId == quizId && item.StudentId == studentId, cancellationToken);

        if (assignment is null)
        {
            return null;
        }

        var quiz = await _dbContext.Quizzes.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == quizId && item.IsActive && !item.IsDeleted, cancellationToken);

        if (quiz is null)
        {
            return null;
        }

        var stats = await QuizQueryHelper.GetAttemptStatsAsync(_dbContext, quizId, studentId, cancellationToken);
        var lookupNames = await QuizQueryHelper.LoadLookupNamesAsync(_dbContext, [quiz], cancellationToken);
        var schools = await QuizQueryHelper.LoadSchoolNamesAsync(_dbContext, [quiz.SchoolId], cancellationToken);

        return QuizQueryHelper.MapQuizDetail(
            quiz,
            assignment,
            lookupNames,
            schools,
            stats.AttemptCount,
            stats.BestPercentage,
            stats.LastSubmittedAt,
            quiz.LifecycleStatusId,
            lookupNames.GetValueOrDefault(quiz.LifecycleStatusId, "Unknown"));
    }

    public async Task AddQuizAsync(Quiz quiz, CancellationToken cancellationToken)
    {
        await _dbContext.Quizzes.AddAsync(quiz, cancellationToken);
    }

    public Task<Quiz?> GetQuizEntityAsync(long quizId, CancellationToken cancellationToken)
    {
        return _dbContext.Quizzes.FirstOrDefaultAsync(quiz => quiz.Id == quizId && !quiz.IsDeleted, cancellationToken);
    }

    public Task DeleteQuizAsync(Quiz quiz, CancellationToken cancellationToken)
    {
        _dbContext.Quizzes.Remove(quiz);
        return Task.CompletedTask;
    }

    public async Task<bool> HasStartedAssignmentsAsync(long quizId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var hasStartedWindow = await _dbContext.QuizAssignments.AsNoTracking()
            .AnyAsync(assignment => assignment.QuizId == quizId && assignment.StartDateTime <= now, cancellationToken);

        if (hasStartedWindow)
        {
            return true;
        }

        return await _dbContext.QuizAttempts.AsNoTracking()
            .AnyAsync(attempt => attempt.QuizId == quizId, cancellationToken);
    }

    public Task<bool> HasAnyAssignmentsAsync(long quizId, CancellationToken cancellationToken)
    {
        return _dbContext.QuizAssignments.AsNoTracking()
            .AnyAsync(assignment => assignment.QuizId == quizId, cancellationToken);
    }

    public Task<bool> HasAnyAttemptsAsync(long quizId, CancellationToken cancellationToken)
    {
        return _dbContext.QuizAttempts.AsNoTracking()
            .AnyAsync(attempt => attempt.QuizId == quizId, cancellationToken);
    }

    public async Task<IReadOnlyList<QuizListItem>> ListForCreatorAsync(
        long creatorUserId,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken)
    {
        var creatorKey = creatorUserId.ToString();
        var query = _dbContext.Quizzes.AsNoTracking()
            .Where(quiz => quiz.CreatedByName == creatorKey && !quiz.IsDeleted);

        query = QuizQueryHelper.ApplyQuizFilters(query, search, subject, grade);
        var quizzes = await query.OrderByDescending(quiz => quiz.CreatedDate).ToListAsync(cancellationToken);
        if (quizzes.Count == 0)
        {
            return Array.Empty<QuizListItem>();
        }

        var lookupNames = await QuizQueryHelper.LoadLookupNamesAsync(_dbContext, quizzes, cancellationToken);
        var lifecycleNames = await QuizQueryHelper.LoadLifecycleNamesAsync(
            _dbContext,
            quizzes.Select(quiz => quiz.LifecycleStatusId),
            cancellationToken);
        var schools = await QuizQueryHelper.LoadSchoolNamesAsync(
            _dbContext,
            quizzes.Select(quiz => quiz.SchoolId).Distinct(),
            cancellationToken);

        return quizzes
            .Select(quiz => QuizQueryHelper.MapQuizWithoutAssignment(
                quiz,
                lookupNames,
                schools,
                0,
                null,
                null,
                quiz.LifecycleStatusId,
                lifecycleNames.GetValueOrDefault(quiz.LifecycleStatusId, "Unknown")))
            .Where(item => QuizQueryHelper.MatchesFilters(item, search, subject, grade))
            .ToArray();
    }

    public async Task<QuizDetailItem?> GetDetailForCreatorAsync(
        long quizId,
        long creatorUserId,
        CancellationToken cancellationToken)
    {
        var creatorKey = creatorUserId.ToString();
        var quiz = await _dbContext.Quizzes.AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.Id == quizId && item.CreatedByName == creatorKey && !item.IsDeleted,
                cancellationToken);

        if (quiz is null)
        {
            return null;
        }

        var lookupNames = await QuizQueryHelper.LoadLookupNamesAsync(_dbContext, [quiz], cancellationToken);
        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        var schools = await QuizQueryHelper.LoadSchoolNamesAsync(_dbContext, [quiz.SchoolId], cancellationToken);

        return new QuizDetailItem(
            quiz.Id,
            null,
            quiz.QuizTitle,
            quiz.Description,
            quiz.TotalQuestions,
            quiz.TotalMarks,
            quiz.TimeLimitMinutes,
            quiz.AllowedAttempts ?? 1,
            null,
            null,
            quiz.CreatedByName,
            schools.GetValueOrDefault(quiz.SchoolId, "School"),
            lookupNames.GetValueOrDefault(quiz.SubjectId, "Subject"),
            lookupNames.GetValueOrDefault(quiz.ClassId, "Grade"),
            lookupNames.GetValueOrDefault(quiz.TopicId, "Topic"),
            lookupNames.GetValueOrDefault(quiz.QuizTypeId, "Quiz"),
            lookupNames.GetValueOrDefault(quiz.DifficultyLevelId, "Medium"),
            quiz.Instructions,
            quiz.ShuffleQuestions,
            quiz.ShuffleOptions,
            quiz.IsReviewRequired,
            0,
            null,
            null,
            quiz.ClassId,
            quiz.SubjectId,
            quiz.TopicId,
            quiz.DifficultyLevelId,
            quiz.LifecycleStatusId,
            lifecycleName);
    }

    public async Task<bool> IsParentPrivateQuizTypeAsync(short quizTypeId, CancellationToken cancellationToken)
    {
        var typeName = await _lookups.GetLookupNameAsync(quizTypeId, cancellationToken);
        return QuizLookupNames.ParentPrivateQuizTypeNames
            .Any(name => name.Equals(typeName, StringComparison.OrdinalIgnoreCase));
    }

    private async Task<IReadOnlyList<QuizListItem>> ListFromAssignmentsAsync(
        IQueryable<QuizAssignment> assignmentQuery,
        string? search,
        string? subject,
        string? grade,
        long? statsStudentId,
        CancellationToken cancellationToken)
    {
        var rows = await (
            from assignment in assignmentQuery.AsNoTracking()
            join quiz in _dbContext.Quizzes.AsNoTracking() on assignment.QuizId equals quiz.Id
            where quiz.IsActive && !quiz.IsDeleted
            select new { assignment, quiz }).ToListAsync(cancellationToken);

        if (rows.Count == 0)
        {
            return Array.Empty<QuizListItem>();
        }

        var lookupNames = await QuizQueryHelper.LoadLookupNamesAsync(
            _dbContext,
            rows.Select(row => row.quiz),
            cancellationToken);
        var schools = await QuizQueryHelper.LoadSchoolNamesAsync(
            _dbContext,
            rows.Select(row => row.quiz.SchoolId).Distinct(),
            cancellationToken);

        var items = new List<QuizListItem>();
        foreach (var row in rows)
        {
            var studentId = statsStudentId ?? row.assignment.StudentId;
            var stats = await QuizQueryHelper.GetAttemptStatsAsync(_dbContext, row.quiz.Id, studentId, cancellationToken);
            var item = QuizQueryHelper.MapQuizListItem(row.quiz, row.assignment, lookupNames, schools, stats);

            if (!QuizQueryHelper.MatchesFilters(item, search, subject, grade))
            {
                continue;
            }

            items.Add(item);
        }

        return items.OrderByDescending(item => item.StartDateTime).ToArray();
    }
}
