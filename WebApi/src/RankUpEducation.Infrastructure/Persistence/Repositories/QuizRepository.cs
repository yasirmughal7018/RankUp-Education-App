using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Lookups;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Approvals;
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

    public async Task<IReadOnlyList<QuizListItem>> ListForStudentAsync(
        long studentId,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken)
    {
        var assigned = await ListFromAssignmentsAsync(
            _dbContext.QuizAssignments.Where(assignment => assignment.StudentId == studentId),
            search,
            subject,
            grade,
            studentId,
            cancellationToken);

        var now = DateTimeOffset.UtcNow;
        assigned = assigned
            .Where(item =>
                item.StartDateTime is null
                || !QuizTypeBehavior.IsHiddenFromStudentUntilStart(
                    item.QuizTypeName,
                    item.StartDateTime.Value,
                    now))
            .ToArray();

        var audienceQuizzes = await _dbContext.Quizzes.AsNoTracking()
            .Where(quiz => quiz.IsActive
                && !quiz.IsDeleted
                && quiz.AudienceStartAt != null
                && quiz.AudienceEndAt != null
                && quiz.AudienceScope == "Public"
                && quiz.AudienceStartAt <= now
                && quiz.AudienceEndAt >= now)
            .ToListAsync(cancellationToken);

        if (audienceQuizzes.Count == 0)
        {
            return assigned;
        }

        var assignedIds = assigned.Select(item => item.QuizId).ToHashSet();
        var lookupNames = await QuizQueryHelper.LoadLookupNamesAsync(_dbContext, audienceQuizzes, cancellationToken);
        var schools = await QuizQueryHelper.LoadSchoolNamesAsync(
            _dbContext,
            audienceQuizzes.Select(quiz => quiz.SchoolId).Distinct(),
            cancellationToken);

        var merged = assigned.ToList();
        foreach (var quiz in audienceQuizzes)
        {
            if (assignedIds.Contains(quiz.Id))
            {
                continue;
            }

            var stats = await QuizQueryHelper.GetAttemptStatsAsync(_dbContext, quiz.Id, studentId, cancellationToken);
            var item = new QuizListItem(
                quiz.Id,
                null,
                quiz.QuizTitle,
                quiz.Description,
                quiz.TotalQuestions,
                quiz.TotalMarks,
                quiz.TimeLimitMinutes,
                quiz.AudienceAllowedAttempts ?? quiz.AllowedAttempts ?? 1,
                quiz.AudienceStartAt,
                quiz.AudienceEndAt,
                quiz.CreatedByName,
                QuizQueryHelper.ResolveSchoolName(schools, quiz.SchoolId),
                lookupNames.GetValueOrDefault(quiz.SubjectId, "Subject"),
                lookupNames.GetValueOrDefault(quiz.ClassId, "Grade"),
                QuizQueryHelper.ResolveLookupName(lookupNames, quiz.TopicId, "Topic"),
                lookupNames.GetValueOrDefault(quiz.QuizTypeId, "Quiz"),
                QuizQueryHelper.ResolveLookupName(lookupNames, quiz.DifficultyLevelId, "Medium"),
                quiz.Instructions,
                quiz.IsReviewRequired,
                stats.AttemptCount,
                stats.BestPercentage,
                stats.LastSubmittedAt,
                lookupNames.GetValueOrDefault(quiz.LifecycleStatusId, "Assigned"));

            if (!QuizQueryHelper.MatchesFilters(item, search, subject, grade))
            {
                continue;
            }

            merged.Add(item);
        }

        return merged.OrderByDescending(item => item.StartDateTime).ToArray();
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
        // Legacy path: scope by school/campus, not creator. Prefer ListForSchoolAsync from the service layer.
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
        var submittedQuizIds = await QuizQueryHelper.LoadQuizIdsSubmittedForReviewAsync(
            _dbContext,
            quizzes.Select(quiz => quiz.Id),
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
                lookupNames.GetValueOrDefault(quiz.LifecycleStatusId, "Unknown"),
                hasSubmittedForReview: submittedQuizIds.Contains(quiz.Id));
            if (QuizQueryHelper.MatchesFilters(item, search, subject, grade))
            {
                items.Add(item);
            }
        }

        return items;
    }

    public async Task<IReadOnlyList<QuizListItem>> ListForSchoolAsync(
        int? schoolId,
        int? campusId,
        long? viewerUserId,
        bool includeAllDrafts,
        bool includeAllSchools,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken)
    {
        var draftIds = await QuizQueryHelper.ResolveStatusIdsByNamesAsync(
            _dbContext,
            LookupNames.QuizLifecycleStatus,
            LookupNames.DraftLifecycleNames,
            cancellationToken);
        var pendingApprovalIds = await QuizQueryHelper.ResolveStatusIdsByNamesAsync(
            _dbContext,
            LookupNames.QuizApprovalStatus,
            LookupNames.PendingApprovalStatusReadNames,
            cancellationToken);
        var pipelineApprovalIds = (
            await QuizQueryHelper.ResolveStatusIdsByNamesAsync(
                _dbContext,
                LookupNames.QuizApprovalStatus,
                LookupNames.SchoolApprovedStatusNames
                    .Concat(LookupNames.ApprovedStatusNames)
                    .Concat(LookupNames.RejectedApprovalStatusNames)
                    .Distinct()
                    .ToArray(),
                cancellationToken))
            .Where(id => !pendingApprovalIds.Contains(id))
            .ToArray();
        var viewerKey = viewerUserId?.ToString();
        var submittedQuizIdQuery = QuizQueryHelper.SubmittedForReviewQuizIds(_dbContext);

        var query = _dbContext.Quizzes.AsNoTracking()
            .Where(quiz => !quiz.IsDeleted);

        // Draft: owner always. PortalAdmin also sees pipeline drafts (submitted / school-approved /
        // approved / rejected). Unsubmitted WIP is owner-only.
        // Published / Assigned / Archived: school/campus scope, or Public (everyone).
        query = query.Where(quiz =>
            (draftIds.Contains(quiz.LifecycleStatusId)
                && (
                    (viewerKey != null && quiz.CreatedByName == viewerKey)
                    || (includeAllDrafts
                        && (
                            pipelineApprovalIds.Contains(quiz.ApprovalStatusId)
                            || (pendingApprovalIds.Contains(quiz.ApprovalStatusId)
                                && submittedQuizIdQuery.Contains(quiz.Id))))))
            || (!draftIds.Contains(quiz.LifecycleStatusId)
                && (quiz.AudienceScope == "Public"
                    || includeAllSchools
                    || (schoolId != null
                        && quiz.SchoolId == schoolId
                        && (campusId == null
                            || quiz.SchoolCampusId == null
                            || quiz.SchoolCampusId == campusId)))));

        query = QuizQueryHelper.ApplyQuizFilters(query, search, subject, grade);
        var quizzes = await query.ToListAsync(cancellationToken);
        var lookupNames = await QuizQueryHelper.LoadLookupNamesAsync(_dbContext, quizzes, cancellationToken);
        var schools = await QuizQueryHelper.LoadSchoolNamesAsync(
            _dbContext,
            quizzes.Select(quiz => quiz.SchoolId).Distinct(),
            cancellationToken);
        var submittedQuizIds = await QuizQueryHelper.LoadQuizIdsSubmittedForReviewAsync(
            _dbContext,
            quizzes.Select(quiz => quiz.Id),
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
                lookupNames.GetValueOrDefault(quiz.LifecycleStatusId, "Unknown"),
                hasSubmittedForReview: submittedQuizIds.Contains(quiz.Id)))
            .ToArray();
    }

    public async Task<IReadOnlyList<PendingQuizApprovalItem>> ListPendingApprovalAsync(
        int? schoolId,
        int? campusId,
        bool includeSchoolApproved,
        CancellationToken cancellationToken)
    {
        var pendingIds = await QuizQueryHelper.ResolveStatusIdsByNamesAsync(
            _dbContext,
            LookupNames.QuizApprovalStatus,
            LookupNames.PendingApprovalStatusReadNames,
            cancellationToken);
        var schoolApprovedIds = includeSchoolApproved
            ? await QuizQueryHelper.ResolveStatusIdsByNamesAsync(
                _dbContext,
                LookupNames.QuizApprovalStatus,
                LookupNames.SchoolApprovedStatusNames,
                cancellationToken)
            : Array.Empty<short>();
        var approvalQueueIds = pendingIds.Concat(schoolApprovedIds).Distinct().ToArray();

        if (approvalQueueIds.Length == 0)
        {
            return Array.Empty<PendingQuizApprovalItem>();
        }

        var parentPrivateTypeIds = await QuizQueryHelper.ResolveStatusIdsByNamesAsync(
            _dbContext,
            LookupNames.QuizType,
            LookupNames.ParentPrivateQuizTypeNames,
            cancellationToken);

        var query = _dbContext.Quizzes.AsNoTracking()
            .Where(quiz =>
                quiz.IsActive &&
                !quiz.IsDeleted &&
                approvalQueueIds.Contains(quiz.ApprovalStatusId));

        var submittedQuizIds = QuizQueryHelper.SubmittedForReviewQuizIds(_dbContext);
        query = query.Where(quiz =>
            schoolApprovedIds.Contains(quiz.ApprovalStatusId)
            || (pendingIds.Contains(quiz.ApprovalStatusId)
                && submittedQuizIds.Contains(quiz.Id)));

        var draftLifecycleIds = await QuizQueryHelper.ResolveStatusIdsByNamesAsync(
            _dbContext,
            LookupNames.QuizLifecycleStatus,
            LookupNames.DraftLifecycleNames,
            cancellationToken);
        if (draftLifecycleIds.Count > 0)
        {
            query = query.Where(quiz => draftLifecycleIds.Contains(quiz.LifecycleStatusId));
        }

        if (schoolId is not null)
        {
            query = query.Where(quiz => quiz.SchoolId == schoolId.Value);
        }

        if (campusId is not null)
        {
            query = query.Where(quiz => quiz.SchoolCampusId == campusId.Value);
        }

        if (parentPrivateTypeIds.Count > 0 && !includeSchoolApproved)
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
                QuizQueryHelper.ResolveSchoolName(schools, quiz.SchoolId),
                lookupNames.GetValueOrDefault(quiz.SubjectId, "Subject"),
                lookupNames.GetValueOrDefault(quiz.ClassId, "Grade"),
                lookupNames.GetValueOrDefault(quiz.QuizTypeId, "Quiz"),
                approvalNames.GetValueOrDefault(quiz.ApprovalStatusId, "Pending"),
                lookupNames.GetValueOrDefault(quiz.LifecycleStatusId, "Unknown"),
                quiz.TotalQuestions,
                quiz.ModifiedDate ?? DateOnly.FromDateTime(DateTime.UtcNow),
                quiz.RejectionReason))
            .ToArray();
    }

    public async Task<QuizDetailItem?> GetDetailForStudentAsync(
        long quizId,
        long studentId,
        CancellationToken cancellationToken)
    {
        var assignment = await _dbContext.QuizAssignments.AsNoTracking()
            .FirstOrDefaultAsync(item => item.QuizId == quizId && item.StudentId == studentId, cancellationToken);

        var quiz = await _dbContext.Quizzes.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == quizId && item.IsActive && !item.IsDeleted, cancellationToken);

        if (quiz is null)
        {
            return null;
        }

        if (assignment is null)
        {
            var canAudience = quiz.AudienceStartAt is not null
                && quiz.AudienceEndAt is not null
                && quiz.AudienceScope.Equals("Public", StringComparison.OrdinalIgnoreCase)
                && quiz.AudienceStartAt <= DateTimeOffset.UtcNow
                && quiz.AudienceEndAt >= DateTimeOffset.UtcNow;
            if (!canAudience)
            {
                return null;
            }
        }
        else
        {
            var typeName = await _lookups.GetLookupNameAsync(quiz.QuizTypeId, cancellationToken);
            if (QuizTypeBehavior.IsHiddenFromStudentUntilStart(
                    typeName,
                    assignment.StartDateTime,
                    DateTimeOffset.UtcNow))
            {
                // No advance notice: treat as not found until the window opens.
                return null;
            }
        }

        var stats = await QuizQueryHelper.GetAttemptStatsAsync(_dbContext, quizId, studentId, cancellationToken);
        var lookupNames = await QuizQueryHelper.LoadLookupNamesAsync(_dbContext, [quiz], cancellationToken);
        var schools = await QuizQueryHelper.LoadSchoolNamesAsync(_dbContext, [quiz.SchoolId], cancellationToken);

        if (assignment is not null)
        {
            var resultStatusName = await _lookups.GetLookupNameAsync(assignment.QuizResultStatus, cancellationToken);
            return QuizQueryHelper.MapQuizDetail(
                quiz,
                assignment,
                lookupNames,
                schools,
                stats.AttemptCount,
                stats.BestPercentage,
                stats.LastSubmittedAt,
                quiz.LifecycleStatusId,
                lookupNames.GetValueOrDefault(quiz.LifecycleStatusId, "Unknown"),
                resultStatusName);
        }

        return new QuizDetailItem(
            quiz.Id,
            null,
            quiz.QuizTitle,
            quiz.Description,
            quiz.TotalQuestions,
            quiz.TotalMarks,
            quiz.TimeLimitMinutes,
            quiz.AudienceAllowedAttempts ?? quiz.AllowedAttempts ?? 1,
            quiz.AudienceStartAt,
            quiz.AudienceEndAt,
            quiz.CreatedByName,
            QuizQueryHelper.ResolveSchoolName(schools, quiz.SchoolId),
            lookupNames.GetValueOrDefault(quiz.SubjectId, "Subject"),
            lookupNames.GetValueOrDefault(quiz.ClassId, "Grade"),
            QuizQueryHelper.ResolveLookupName(lookupNames, quiz.TopicId, "Topic"),
            lookupNames.GetValueOrDefault(quiz.QuizTypeId, "Quiz"),
            QuizQueryHelper.ResolveLookupName(lookupNames, quiz.DifficultyLevelId, "Medium"),
            quiz.Instructions,
            quiz.ShuffleQuestions,
            quiz.ShuffleOptions,
            quiz.IsReviewRequired,
            quiz.NavigationMode,
            stats.AttemptCount,
            stats.BestPercentage,
            stats.LastSubmittedAt,
            quiz.ClassId,
            quiz.SubjectId,
            quiz.TopicId ?? 0,
            quiz.DifficultyLevelId ?? 0,
            quiz.LifecycleStatusId,
            lookupNames.GetValueOrDefault(quiz.LifecycleStatusId, "Assigned"),
            ReviewDisplayMode: string.IsNullOrWhiteSpace(quiz.ReviewDisplayMode) ? "ScoreOnly" : quiz.ReviewDisplayMode,
            RandomQuestionCount: quiz.RandomQuestionCount);
    }

    public async Task AddQuizAsync(Quiz quiz, CancellationToken cancellationToken)
    {
        await _dbContext.Quizzes.AddAsync(quiz, cancellationToken);
    }

    public Task<Quiz?> GetQuizEntityAsync(long quizId, CancellationToken cancellationToken)
    {
        return _dbContext.Quizzes.FirstOrDefaultAsync(quiz => quiz.Id == quizId && !quiz.IsDeleted, cancellationToken);
    }

    public async Task DeleteQuizAsync(Quiz quiz, CancellationToken cancellationToken)
    {
        var quizId = quiz.Id;

        var questionLinks = await _dbContext.QuizQuestions
            .Where(link => link.QuizId == quizId)
            .ToListAsync(cancellationToken);
        _dbContext.QuizQuestions.RemoveRange(questionLinks);

        var assignments = await _dbContext.QuizAssignments
            .Where(assignment => assignment.QuizId == quizId)
            .ToListAsync(cancellationToken);
        _dbContext.QuizAssignments.RemoveRange(assignments);

        // quiz_reviews cascade on quiz delete; attempts must not exist for hard-delete callers.
        _dbContext.Quizzes.Remove(quiz);
    }

    public async Task<bool> HasStartedAssignmentsAsync(long quizId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var quiz = await _dbContext.Quizzes.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == quizId && !item.IsDeleted, cancellationToken);

        if (quiz is not null
            && quiz.AudienceScope.Equals("Public", StringComparison.OrdinalIgnoreCase)
            && quiz.AudienceStartAt is not null
            && quiz.AudienceStartAt <= now)
        {
            return true;
        }

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

    public Task<bool> HasSubmittedForReviewAsync(long quizId, CancellationToken cancellationToken)
    {
        return QuizQueryHelper.SubmittedForReviewQuizIds(_dbContext)
            .AnyAsync(id => id == quizId, cancellationToken);
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
        var submittedQuizIds = await QuizQueryHelper.LoadQuizIdsSubmittedForReviewAsync(
            _dbContext,
            quizzes.Select(quiz => quiz.Id),
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
                lifecycleNames.GetValueOrDefault(quiz.LifecycleStatusId, "Unknown"),
                hasSubmittedForReview: submittedQuizIds.Contains(quiz.Id)))
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

        return await MapManageDetailAsync(quiz, cancellationToken);
    }

    public async Task<QuizDetailItem?> GetDetailForManageAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var quiz = await _dbContext.Quizzes.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == quizId && !item.IsDeleted, cancellationToken);

        if (quiz is null)
        {
            return null;
        }

        return await MapManageDetailAsync(quiz, cancellationToken);
    }

    private async Task<QuizDetailItem> MapManageDetailAsync(Quiz quiz, CancellationToken cancellationToken)
    {
        var lookupNames = await QuizQueryHelper.LoadLookupNamesAsync(_dbContext, [quiz], cancellationToken);
        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        var approvalName = await _lookups.GetLookupNameAsync(quiz.ApprovalStatusId, cancellationToken);
        var schools = await QuizQueryHelper.LoadSchoolNamesAsync(_dbContext, [quiz.SchoolId], cancellationToken);

        var approvalHistory = await (
            from approval in _dbContext.Approvals.AsNoTracking()
            join actor in _dbContext.Users.AsNoTracking() on approval.ApprovedByUserId equals actor.Id
            where approval.EntityType == ApprovalEntityType.Quiz
                && approval.RequestId == quiz.Id
                && approval.Action != null
            orderby approval.CreatedAt, approval.Id
            select new QuizApprovalEventItem(
                approval.Id,
                approval.Action!.Value,
                approval.ApprovedByUserId,
                actor.FullName,
                approval.ApprovedByRole,
                approval.Reason,
                approval.CreatedAt)
        ).ToListAsync(cancellationToken);

        var creatorDisplayName = await ResolveCreatorDisplayNameAsync(
            quiz.CreatedByName,
            approvalHistory,
            cancellationToken);
        var createdAt = ResolveCreatedAt(quiz, approvalHistory);

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
            QuizQueryHelper.ResolveSchoolName(schools, quiz.SchoolId),
            lookupNames.GetValueOrDefault(quiz.SubjectId, "Subject"),
            lookupNames.GetValueOrDefault(quiz.ClassId, "Grade"),
            QuizQueryHelper.ResolveLookupName(lookupNames, quiz.TopicId, "Topic"),
            lookupNames.GetValueOrDefault(quiz.QuizTypeId, "Quiz"),
            QuizQueryHelper.ResolveLookupName(lookupNames, quiz.DifficultyLevelId, "Medium"),
            quiz.Instructions,
            quiz.ShuffleQuestions,
            quiz.ShuffleOptions,
            quiz.IsReviewRequired,
            quiz.NavigationMode,
            0,
            null,
            null,
            quiz.ClassId,
            quiz.SubjectId,
            quiz.TopicId ?? 0,
            quiz.DifficultyLevelId ?? 0,
            quiz.LifecycleStatusId,
            lifecycleName,
            ReviewDisplayMode: string.IsNullOrWhiteSpace(quiz.ReviewDisplayMode) ? "ScoreOnly" : quiz.ReviewDisplayMode,
            ApprovalStatus: approvalName,
            RejectionReason: quiz.RejectionReason,
            ApprovalHistory: approvalHistory,
            SchoolId: quiz.SchoolId,
            CampusId: quiz.SchoolCampusId,
            RandomQuestionCount: quiz.RandomQuestionCount,
            CreatorDisplayName: creatorDisplayName,
            CreatedAt: createdAt);
    }

    private async Task<string> ResolveCreatorDisplayNameAsync(
        string createdByName,
        IReadOnlyList<QuizApprovalEventItem> approvalHistory,
        CancellationToken cancellationToken)
    {
        if (long.TryParse(createdByName, out var creatorUserId) && creatorUserId > 0)
        {
            var fullName = await _dbContext.Users.AsNoTracking()
                .Where(user => user.Id == creatorUserId)
                .Select(user => user.FullName)
                .FirstOrDefaultAsync(cancellationToken);
            if (!string.IsNullOrWhiteSpace(fullName))
            {
                return fullName.Trim();
            }
        }

        var createdEvent = approvalHistory.FirstOrDefault(entry => entry.Action == ApprovalAction.Created);
        if (!string.IsNullOrWhiteSpace(createdEvent?.ActorName))
        {
            return createdEvent.ActorName.Trim();
        }

        return createdByName.Trim();
    }

    private static DateTimeOffset ResolveCreatedAt(
        Quiz quiz,
        IReadOnlyList<QuizApprovalEventItem> approvalHistory)
    {
        var createdEvent = approvalHistory.FirstOrDefault(entry => entry.Action == ApprovalAction.Created);
        if (createdEvent is not null)
        {
            return createdEvent.OccurredAt;
        }

        return new DateTimeOffset(
            quiz.CreatedDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            TimeSpan.Zero);
    }

    public async Task AddApprovalEventAsync(Approval approval, CancellationToken cancellationToken)
    {
        await _dbContext.Approvals.AddAsync(approval, cancellationToken);
    }

    public async Task<bool> IsParentPrivateQuizTypeAsync(short quizTypeId, CancellationToken cancellationToken)
    {
        var typeName = await _lookups.GetLookupNameAsync(quizTypeId, cancellationToken);
        return LookupNames.ParentPrivateQuizTypeNames
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
        var resultStatusIds = rows.Select(row => row.assignment.QuizResultStatus).Distinct().ToArray();
        var resultStatusNames = await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => resultStatusIds.Contains(lookup.Id))
            .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);
        var schools = await QuizQueryHelper.LoadSchoolNamesAsync(
            _dbContext,
            rows.Select(row => row.quiz.SchoolId).Distinct(),
            cancellationToken);

        var items = new List<QuizListItem>();
        foreach (var row in rows)
        {
            var studentId = statsStudentId ?? row.assignment.StudentId;
            var stats = await QuizQueryHelper.GetAttemptStatsAsync(_dbContext, row.quiz.Id, studentId, cancellationToken);
            var item = QuizQueryHelper.MapQuizListItem(
                row.quiz,
                row.assignment,
                lookupNames,
                schools,
                stats,
                resultStatusNames.GetValueOrDefault(row.assignment.QuizResultStatus));

            if (!QuizQueryHelper.MatchesFilters(item, search, subject, grade))
            {
                continue;
            }

            items.Add(item);
        }

        return items.OrderByDescending(item => item.StartDateTime).ToArray();
    }
}
