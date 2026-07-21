using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Questions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

/// <summary>
/// EF Core question-bank repository. List filtering encodes own-rows + Approved visibility
/// (Public / School / Campus, with SchoolAdmin campus widen) and org-scoped pending queues.
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

        // Quiz eligibility: active + has approver + non-None visibility (Approved).
        if (eligibleForQuizOnly)
        {
            query = query.Where(question =>
                question.IsActive
                && question.ApprovedBy != null
                && question.ApprovedBy != ""
                && question.VisibilityLevel != QuestionVisibilityLevels.None);
        }

        if (pendingApprovalOnly)
        {
            query = query.Where(question =>
                question.StatusId == QuizLookupNames.QuestionStatusIds.PendingReview);

            // Approver queues are org-scoped (PortalAdmin passes null visibilityScope).
            if (visibilityScope is not null)
            {
                if (visibilityScope.IsSchoolAdmin && visibilityScope.SchoolId.HasValue)
                {
                    var schoolId = visibilityScope.SchoolId.Value;
                    query = query.Where(question => question.SchoolId == schoolId);
                }
                else if (visibilityScope.CampusId.HasValue)
                {
                    var campusId = visibilityScope.CampusId.Value;
                    query = query.Where(question => question.CampusId == campusId);
                }
                else
                {
                    // No org on approver → empty pending queue.
                    return Array.Empty<QuestionListItem>();
                }
            }
        }

        // Non–PortalAdmin bank list: own rows OR Approved within Public/School/Campus visibility.
        // SchoolAdmin also sees Campus-approved rows across their school.
        if (visibilityScope is not null && !pendingApprovalOnly)
        {
            var approvedLookups = await _dbContext.Lookups.AsNoTracking()
                .Where(lookup => lookup.Type == QuizLookupNames.QuestionStatus)
                .ToListAsync(cancellationToken);
            var approvedStatusIdList = approvedLookups
                .Where(lookup =>
                    QuizLookupNames.IsApprovedQuestionStatusId(lookup.Id)
                    || QuizLookupNames.IsApprovedQuestionStatusName(lookup.Name))
                .Select(lookup => lookup.Id)
                .ToList();

            var ownerKey = visibilityScope.UserId.ToString();
            var schoolId = visibilityScope.SchoolId;
            var campusId = visibilityScope.CampusId;
            var isSchoolAdmin = visibilityScope.IsSchoolAdmin;

            query = query.Where(question =>
                question.CreatedBy == ownerKey
                || (approvedStatusIdList.Contains(question.StatusId)
                    && (
                        question.VisibilityLevel == QuestionVisibilityLevels.Public
                        || (question.VisibilityLevel == QuestionVisibilityLevels.School
                            && schoolId.HasValue
                            && question.SchoolId == schoolId)
                        || (question.VisibilityLevel == QuestionVisibilityLevels.Campus
                            && campusId.HasValue
                            && question.CampusId == campusId)
                        || (question.VisibilityLevel == QuestionVisibilityLevels.Campus
                            && isSchoolAdmin
                            && schoolId.HasValue
                            && question.SchoolId == schoolId))));
        }
        else if (createdByUserId.HasValue)
        {
            var ownerKey = createdByUserId.Value.ToString();
            query = query.Where(question => question.CreatedBy == ownerKey);
        }

        // Quiz picker: same org visibility rules when scope is provided (PortalAdmin skips).
        if (eligibleForQuizOnly && visibilityScope is not null)
        {
            var schoolId = visibilityScope.SchoolId;
            var campusId = visibilityScope.CampusId;
            var isSchoolAdmin = visibilityScope.IsSchoolAdmin;

            query = query.Where(question =>
                question.VisibilityLevel == QuestionVisibilityLevels.Public
                || (question.VisibilityLevel == QuestionVisibilityLevels.School
                    && schoolId.HasValue
                    && question.SchoolId == schoolId)
                || (question.VisibilityLevel == QuestionVisibilityLevels.Campus
                    && campusId.HasValue
                    && question.CampusId == campusId)
                || (question.VisibilityLevel == QuestionVisibilityLevels.Campus
                    && isSchoolAdmin
                    && schoolId.HasValue
                    && question.SchoolId == schoolId));
        }

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
                question.IsActive,
                question.CreatedBy,
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

        var approvedStatusIds = eligibleForQuizOnly
            ? lookupNames
                .Where(pair =>
                    QuizLookupNames.IsApprovedQuestionStatusId(pair.Key)
                    || QuizLookupNames.IsApprovedQuestionStatusName(pair.Value))
                .Select(pair => pair.Key)
                .ToHashSet()
            : null;

        return rows
            .Where(row => approvedStatusIds is null || approvedStatusIds.Contains(row.StatusId))
            .Select(row => new QuestionListItem(
                row.Id,
                row.QuestionText,
                lookupNames.GetValueOrDefault(row.QuestionTypeId, "Multiple Choice"),
                lookupNames.GetValueOrDefault(row.StatusId, "PendingReview"),
                row.ClassId,
                row.SubjectId,
                row.DifficultyLevel,
                row.Marks,
                row.IsActive,
                row.CreatedBy,
                row.ApprovedBy,
                row.IsAiApproved,
                row.SchoolId,
                row.CampusId,
                row.VisibilityLevel,
                QuestionVisibilityLevels.ToName(row.VisibilityLevel),
                row.CreatedDate,
                row.ModifiedDate))
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
            question.CreatedBy,
            question.ApprovedBy,
            question.IsAiApproved,
            question.RejectionReason,
            question.SchoolId,
            question.CampusId,
            question.VisibilityLevel,
            QuestionVisibilityLevels.ToName(question.VisibilityLevel),
            question.CreatedDate,
            question.ModifiedDate,
            options,
            acceptedAnswers);
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
