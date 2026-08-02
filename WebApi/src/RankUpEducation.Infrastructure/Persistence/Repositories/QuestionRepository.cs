using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Lookups;
using RankUpEducation.Application.Questions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Approvals;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

/// <summary>
/// EF Core question-bank repository. List filtering encodes own + Public + restricted
/// non-public (creator-tier upward admins), hierarchy-scoped pending queues, and
/// Public-only quiz eligibility.
/// </summary>
public sealed class QuestionRepository : IQuestionRepository
{
    private readonly RankUpDbContext _dbContext;

    public QuestionRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddQuestionAsync(Question question, CancellationToken cancellationToken)
    {
        await _dbContext.Questions.AddAsync(question, cancellationToken);
    }

    public void DetachQuestion(Question question)
    {
        var entry = _dbContext.Entry(question);
        if (entry.State != EntityState.Detached)
        {
            entry.State = EntityState.Detached;
        }
    }

    public Task<Question?> GetQuestionEntityAsync(long questionId, CancellationToken cancellationToken)
    {
        return _dbContext.Questions.FirstOrDefaultAsync(
            question => question.Id == questionId && question.IsActive,
            cancellationToken);
    }

    public Task<Question?> GetQuestionEntityForManageAsync(long questionId, CancellationToken cancellationToken)
    {
        return _dbContext.Questions
            .Include(question => question.Options)
            .FirstOrDefaultAsync(question => question.Id == questionId, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<QuestionListItem>> ListQuestionsAsync(
        long? createdByUserId,
        bool? isActive,
        short? subjectId,
        short? classId,
        bool pendingApprovalOnly,
        bool eligibleForQuizOnly,
        QuestionListVisibilityScope? visibilityScope,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Questions.AsNoTracking().AsQueryable();

        if (isActive.HasValue)
        {
            query = query.Where(question => question.IsActive == isActive.Value);
        }

        if (subjectId.HasValue)
        {
            query = query.Where(question => question.SubjectId == subjectId.Value);
        }

        if (classId.HasValue)
        {
            query = query.Where(question => question.ClassId == classId.Value);
        }

        // Soft quiz-use flags: active + ApprovedBy + Public (PortalAdmin-published only).
        // Approved status is applied after fetch (see approvedStatusIds filter below).
        if (eligibleForQuizOnly)
        {
            query = query.Where(question =>
                question.IsActive
                && question.ApprovedBy != null
                && question.VisibilityLevel == QuestionVisibilityLevels.Public);
        }

        if (pendingApprovalOnly)
        {
            query = query.Where(question =>
                question.StatusId == LookupNames.QuestionStatusIds.PendingReview);

            // Approver queues: org + creator-tier hierarchy (PortalAdmin passes null scope).
            if (visibilityScope is not null)
            {
                var viewerUserId = visibilityScope.UserId;
                var teacherRole = UserRole.Teacher;
                var parentRole = UserRole.Parent;
                var campusAdminRole = UserRole.CampusAdmin;

                if (visibilityScope.Role == UserRole.SchoolAdmin && visibilityScope.SchoolId.HasValue)
                {
                    var schoolId = visibilityScope.SchoolId.Value;
                    query = query.Where(question =>
                        question.SchoolId == schoolId
                        && question.CreatedBy != viewerUserId
                        && (question.CreatedByRole == teacherRole
                            || question.CreatedByRole == parentRole
                            || question.CreatedByRole == campusAdminRole));
                }
                else if (visibilityScope.Role == UserRole.CampusAdmin && visibilityScope.CampusId.HasValue)
                {
                    var campusId = visibilityScope.CampusId.Value;
                    query = query.Where(question =>
                        question.CampusId == campusId
                        && question.CreatedBy != viewerUserId
                        && (question.CreatedByRole == teacherRole
                            || question.CreatedByRole == parentRole));
                }
                else
                {
                    // No org on approver, or role cannot endorse → empty pending queue.
                    return Array.Empty<QuestionListItem>();
                }
            }
        }

        // Non–PortalAdmin bank list: own + Public + restricted non-public for upward admins.
        if (visibilityScope is not null && !pendingApprovalOnly && !eligibleForQuizOnly)
        {
            var ownerUserId = visibilityScope.UserId;
            var schoolId = visibilityScope.SchoolId;
            var campusId = visibilityScope.CampusId;
            var viewerRole = visibilityScope.Role;
            var teacherRole = UserRole.Teacher;
            var parentRole = UserRole.Parent;
            var campusAdminRole = UserRole.CampusAdmin;

            query = query.Where(question =>
                question.CreatedBy == ownerUserId
                || question.VisibilityLevel == QuestionVisibilityLevels.Public
                || (viewerRole == UserRole.SchoolAdmin
                    && schoolId.HasValue
                    && question.SchoolId == schoolId
                    && question.VisibilityLevel != QuestionVisibilityLevels.Public
                    && (question.CreatedByRole == teacherRole
                        || question.CreatedByRole == parentRole
                        || question.CreatedByRole == campusAdminRole))
                || (viewerRole == UserRole.CampusAdmin
                    && campusId.HasValue
                    && question.CampusId == campusId
                    && question.VisibilityLevel != QuestionVisibilityLevels.Public
                    && (question.CreatedByRole == teacherRole
                        || question.CreatedByRole == parentRole)));
        }
        else if (createdByUserId.HasValue)
        {
            var ownerUserId = createdByUserId.Value;
            query = query.Where(question => question.CreatedBy == ownerUserId);
        }

        // Quiz picker for non–PortalAdmin: Public only (already filtered above; scope unused).
        // PortalAdmin also gets Public-only via eligibleForQuizOnly filter.

        var rows = await query
            .OrderByDescending(question => question.ModifiedDate)
            .ThenByDescending(question => question.Id)
            .Select(question => new
            {
                question.Id,
                question.QuestionText,
                question.QuestionTypeId,
                question.StatusId,
                question.ClassId,
                question.SubjectId,
                question.DifficultyLevel,
                question.Marks,
                question.EstimatedTimeSeconds,
                question.IsActive,
                question.CreatedBy,
                question.CreatedByRole,
                question.ApprovedBy,
                question.IsAiApproved,
                question.SchoolId,
                question.CampusId,
                question.VisibilityLevel,
                question.CreatedDate,
                question.ModifiedDate
            })
            .ToListAsync(cancellationToken);

        if (rows.Count == 0)
        {
            return Array.Empty<QuestionListItem>();
        }

        var lookupIds = rows.Select(row => row.QuestionTypeId)
            .Concat(rows.Select(row => row.StatusId))
            .Distinct()
            .ToArray();

        var lookupNames = await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => lookupIds.Contains(lookup.Id))
            .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);

        var userIds = rows.Select(row => row.CreatedBy)
            .Concat(rows.Where(row => row.ApprovedBy.HasValue).Select(row => row.ApprovedBy!.Value))
            .Distinct()
            .ToArray();

        var userNames = userIds.Length == 0
            ? new Dictionary<long, string>()
            : await _dbContext.Users.AsNoTracking()
                .Where(user => userIds.Contains(user.Id))
                .ToDictionaryAsync(user => user.Id, user => user.FullName, cancellationToken);

        var approvedStatusIds = eligibleForQuizOnly
            ? lookupNames
                .Where(pair =>
                    LookupNames.IsApprovedQuestionStatusId(pair.Key)
                    || LookupNames.IsApprovedQuestionStatusName(pair.Value))
                .Select(pair => pair.Key)
                .ToHashSet()
            : null;

        var filteredRows = rows
            .Where(row => approvedStatusIds is null || approvedStatusIds.Contains(row.StatusId))
            .ToArray();

        if (filteredRows.Length == 0)
        {
            return Array.Empty<QuestionListItem>();
        }

        var questionIds = filteredRows.Select(row => row.Id).ToArray();

        var correctOptions = await _dbContext.QuestionOptions.AsNoTracking()
            .Where(option => questionIds.Contains(option.QuestionId) && option.IsCorrect)
            .Select(option => new { option.QuestionId, option.OptionText })
            .ToListAsync(cancellationToken);

        var acceptedAnswers = await _dbContext.QuestionAcceptedAnswers.AsNoTracking()
            .Where(answer => questionIds.Contains(answer.QuestionId))
            .Select(answer => new { answer.QuestionId, answer.AnswerText })
            .ToListAsync(cancellationToken);

        var correctAnswerPreviews = questionIds.ToDictionary(
            id => id,
            id =>
            {
                var parts = correctOptions
                    .Where(option => option.QuestionId == id)
                    .Select(option => option.OptionText.Trim())
                    .Where(text => text.Length > 0)
                    .Concat(
                        acceptedAnswers
                            .Where(answer => answer.QuestionId == id)
                            .Select(answer => answer.AnswerText.Trim())
                            .Where(text => text.Length > 0))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray();
                return parts.Length == 0 ? string.Empty : string.Join(", ", parts);
            });

        return filteredRows
            .Select(row => new QuestionListItem(
                row.Id,
                row.QuestionText,
                lookupNames.GetValueOrDefault(row.QuestionTypeId, "Multiple Choice"),
                lookupNames.GetValueOrDefault(row.StatusId, "PendingReview"),
                row.ClassId,
                row.SubjectId,
                row.DifficultyLevel,
                row.Marks,
                row.EstimatedTimeSeconds,
                row.IsActive,
                row.CreatedBy.ToString(),
                userNames.GetValueOrDefault(row.CreatedBy, row.CreatedBy.ToString()),
                row.CreatedByRole,
                row.ApprovedBy?.ToString(),
                row.ApprovedBy is long approvedByUserId
                    ? userNames.GetValueOrDefault(approvedByUserId, approvedByUserId.ToString())
                    : null,
                row.IsAiApproved,
                row.SchoolId,
                row.CampusId,
                row.VisibilityLevel,
                QuestionVisibilityLevels.ToName(row.VisibilityLevel),
                row.CreatedDate,
                row.ModifiedDate,
                correctAnswerPreviews.GetValueOrDefault(row.Id, string.Empty)))
            .ToArray();
    }

    public async Task<QuestionDetailItem?> GetQuestionDetailAsync(long questionId, CancellationToken cancellationToken)
    {
        var question = await _dbContext.Questions.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == questionId, cancellationToken);

        if (question is null)
        {
            return null;
        }

        var options = await _dbContext.QuestionOptions.AsNoTracking()
            .Where(option => option.QuestionId == questionId && option.IsActive)
            .Select(option => new QuizQuestionOptionItem(
                option.Id,
                option.OptionText,
                option.OptionImageUrl,
                option.IsCorrect))
            .ToListAsync(cancellationToken);

        var acceptedAnswers = await _dbContext.QuestionAcceptedAnswers.AsNoTracking()
            .Where(answer => answer.QuestionId == questionId)
            .Select(answer => new QuestionAcceptedAnswerItem(
                answer.Id,
                answer.AnswerText,
                answer.IsCaseSensitive,
                answer.AllowPartialMatch,
                answer.NormalizedAnswer,
                answer.MinimumLength,
                answer.MaximumLength,
                answer.AllowAiReview,
                answer.AllowTeacherReview))
            .ToListAsync(cancellationToken);

        var lookupIds = new[] { question.QuestionTypeId, question.StatusId };
        var lookupNames = await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => lookupIds.Contains(lookup.Id))
            .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);

        var userIds = new List<long> { question.CreatedBy };
        if (question.ApprovedBy.HasValue)
        {
            userIds.Add(question.ApprovedBy.Value);
        }

        var userNames = await _dbContext.Users.AsNoTracking()
            .Where(user => userIds.Contains(user.Id))
            .ToDictionaryAsync(user => user.Id, user => user.FullName, cancellationToken);

        var approvalHistory = await (
            from approval in _dbContext.Approvals.AsNoTracking()
            join actor in _dbContext.Users.AsNoTracking() on approval.ApprovedByUserId equals actor.Id
            where approval.EntityType == ApprovalEntityType.Question
                && approval.QuestionId == questionId
                && approval.Action != null
            orderby approval.CreatedAt, approval.Id
            select new QuestionApprovalEventItem(
                approval.Id,
                approval.Action!.Value,
                approval.ApprovedByUserId,
                actor.FullName,
                approval.ApprovedByRole,
                approval.Reason,
                approval.CreatedAt)
        ).ToListAsync(cancellationToken);

        return new QuestionDetailItem(
            question.Id,
            question.QuestionText,
            question.QuestionTypeId,
            lookupNames.GetValueOrDefault(question.QuestionTypeId, "Multiple Choice"),
            question.ClassId,
            question.SubjectId,
            question.TopicId,
            question.DifficultyLevel,
            question.StatusId,
            lookupNames.GetValueOrDefault(question.StatusId, "Pending"),
            question.Marks,
            question.EstimatedTimeSeconds,
            question.Hint,
            question.Explanation,
            question.IsActive,
            question.CreatedBy.ToString(),
            userNames.GetValueOrDefault(question.CreatedBy, question.CreatedBy.ToString()),
            question.CreatedByRole,
            question.ApprovedBy?.ToString(),
            question.ApprovedBy is long approvedByUserId
                ? userNames.GetValueOrDefault(approvedByUserId, approvedByUserId.ToString())
                : null,
            question.IsAiApproved,
            question.RejectionReason,
            question.SchoolId,
            question.CampusId,
            question.VisibilityLevel,
            QuestionVisibilityLevels.ToName(question.VisibilityLevel),
            question.CreatedDate,
            question.ModifiedDate,
            options,
            acceptedAnswers,
            approvalHistory);
    }

    public async Task AddApprovalEventAsync(Approval approval, CancellationToken cancellationToken)
    {
        await _dbContext.Approvals.AddAsync(approval, cancellationToken);
    }

    public Task<int> CountQuizLinksAsync(long questionId, CancellationToken cancellationToken)
    {
        return _dbContext.QuizQuestions.AsNoTracking()
            .CountAsync(link => link.QuestionId == questionId, cancellationToken);
    }

    public async Task RemoveAllQuizLinksForQuestionAsync(long questionId, CancellationToken cancellationToken)
    {
        var links = await _dbContext.QuizQuestions
            .Where(link => link.QuestionId == questionId)
            .ToListAsync(cancellationToken);
        _dbContext.QuizQuestions.RemoveRange(links);
    }

    public Task DeleteQuestionAsync(Question question, CancellationToken cancellationToken)
    {
        _dbContext.Questions.Remove(question);
        return Task.CompletedTask;
    }

    public async Task RemoveQuestionOptionsAsync(long questionId, CancellationToken cancellationToken)
    {
        var options = await _dbContext.QuestionOptions
            .Where(option => option.QuestionId == questionId)
            .ToListAsync(cancellationToken);
        _dbContext.QuestionOptions.RemoveRange(options);
    }

    public async Task AddQuestionOptionsAsync(IReadOnlyList<QuestionOption> options, CancellationToken cancellationToken)
    {
        await _dbContext.QuestionOptions.AddRangeAsync(options, cancellationToken);
    }

    public async Task RemoveQuestionAcceptedAnswersAsync(long questionId, CancellationToken cancellationToken)
    {
        var answers = await _dbContext.QuestionAcceptedAnswers
            .Where(answer => answer.QuestionId == questionId)
            .ToListAsync(cancellationToken);
        _dbContext.QuestionAcceptedAnswers.RemoveRange(answers);
    }

    public async Task AddQuestionAcceptedAnswersAsync(
        IReadOnlyList<QuestionAcceptedAnswer> answers,
        CancellationToken cancellationToken)
    {
        await _dbContext.QuestionAcceptedAnswers.AddRangeAsync(answers, cancellationToken);
    }
}
