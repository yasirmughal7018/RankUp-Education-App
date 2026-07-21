using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Contracts.Questions;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Application.Questions;

public interface IQuestionService
{
    Task<QuestionListResponse> ListAsync(
        bool? isActive,
        short? subjectId,
        short? classId,
        bool pendingApprovalOnly,
        bool eligibleForQuizOnly,
        CancellationToken cancellationToken);

    Task<QuestionListResponse> ListPendingApprovalAsync(CancellationToken cancellationToken);

    Task<QuestionDetailResponse> GetByIdAsync(long questionId, CancellationToken cancellationToken);

    Task<QuestionDetailResponse> CreateAsync(CreateQuestionRequest request, CancellationToken cancellationToken);

    Task<QuestionDetailResponse> UpdateAsync(
        long questionId,
        UpdateQuestionRequest request,
        CancellationToken cancellationToken);

    Task<QuestionDetailResponse> SubmitForReviewAsync(long questionId, CancellationToken cancellationToken);

    Task<QuestionApprovalResponse> ApproveAsync(long questionId, CancellationToken cancellationToken);

    Task<QuestionApprovalResponse> RejectAsync(
        long questionId,
        RejectQuestionRequest request,
        CancellationToken cancellationToken);

    Task<QuestionActiveStateResponse> ActivateAsync(long questionId, CancellationToken cancellationToken);

    Task<QuestionActiveStateResponse> DeactivateAsync(long questionId, CancellationToken cancellationToken);

    Task<QuestionActiveStateResponse> ArchiveAsync(long questionId, CancellationToken cancellationToken);

    Task<DeleteQuestionResponse> DeleteAsync(long questionId, CancellationToken cancellationToken);

    Task<ImportQuestionsResponse> ImportAsync(
        IReadOnlyList<QuestionExcelImportRow> rows,
        bool dryRun,
        CancellationToken cancellationToken);
}

public sealed class QuestionService : IQuestionService
{
    public const int MinRejectionReasonLength = 10;

    private readonly IQuestionRepository _questions;
    private readonly ILookupRepository _lookups;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly QuizManageGuard _guard;

    public QuestionService(
        IQuestionRepository questions,
        ILookupRepository lookups,
        IQuizRepository quizzes,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser)
    {
        _questions = questions;
        _lookups = lookups;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _guard = new QuizManageGuard(quizzes, lookups);
    }

    public async Task<QuestionListResponse> ListAsync(
        bool? isActive,
        short? subjectId,
        short? classId,
        bool pendingApprovalOnly,
        bool eligibleForQuizOnly,
        CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireManageScope(_currentUser);

        // PortalAdmin: all. Others: own rows OR Approved (bank visibility).
        long? createdByUserId = null;
        var includeAllApproved = !scope.IsPortalAdmin;
        if (!scope.IsPortalAdmin && !eligibleForQuizOnly)
        {
            createdByUserId = scope.UserId;
        }

        if (eligibleForQuizOnly)
        {
            // Quiz picker: shared Approved bank for all manage roles.
            createdByUserId = null;
            includeAllApproved = false;
        }

        var items = await _questions.ListQuestionsAsync(
            createdByUserId,
            isActive,
            subjectId,
            classId,
            pendingApprovalOnly,
            eligibleForQuizOnly,
            includeAllApproved,
            cancellationToken);

        return new QuestionListResponse(items.Select(QuestionMapping.ToSummaryResponse).ToArray());
    }

    public async Task<QuestionListResponse> ListPendingApprovalAsync(CancellationToken cancellationToken)
    {
        QuestionScopeResolver.RequireApprovalScope(_currentUser);
        var items = await _questions.ListQuestionsAsync(
            createdByUserId: null,
            isActive: null,
            subjectId: null,
            classId: null,
            pendingApprovalOnly: true,
            eligibleForQuizOnly: false,
            includeAllApprovedForOwnerScope: false,
            cancellationToken);

        return new QuestionListResponse(items.Select(QuestionMapping.ToSummaryResponse).ToArray());
    }

    public async Task<QuestionDetailResponse> GetByIdAsync(long questionId, CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireManageScope(_currentUser);
        var detail = await RequireQuestionDetailAsync(questionId, cancellationToken);
        EnsureCanView(detail, scope);
        return QuestionMapping.ToDetailResponse(detail);
    }

    public async Task<QuestionDetailResponse> CreateAsync(
        CreateQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireManageScope(_currentUser);
        QuestionBankGuard.ValidateCreateRequest(request);

        var questionTypeId = await _guard.ResolveQuestionTypeIdAsync(request.QuestionType, cancellationToken);
        var difficultyLevelId = await _guard.ResolveDifficultyLevelIdAsync(request.DifficultyLevel, cancellationToken);
        // No Draft: create always enters PendingReview (IsActive=false until Approve).
        var statusId = await RequirePendingReviewStatusIdAsync(cancellationToken);

        var question = new Question(
            request.QuestionText,
            questionTypeId,
            request.ClassId,
            request.SubjectId,
            request.TopicId,
            difficultyLevelId,
            statusId,
            scope.UserId.ToString(),
            request.EstimatedTimeSeconds,
            request.Marks);

        question.UpdateDetails(
            request.QuestionText,
            questionTypeId,
            request.ClassId,
            request.SubjectId,
            request.TopicId,
            difficultyLevelId,
            request.EstimatedTimeSeconds,
            request.Marks,
            request.Hint,
            request.Explanation);

        // Ensure PendingReview + inactive even if entity defaults change.
        question.SubmitForApproval(statusId);

        await _questions.AddQuestionAsync(question, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await ReplaceAnswersAsync(
            question.Id,
            request.QuestionType,
            request.Options,
            request.AcceptedAnswers,
            cancellationToken);

        var detail = await RequireQuestionDetailAsync(question.Id, cancellationToken);
        return QuestionMapping.ToDetailResponse(detail);
    }

    public async Task<QuestionDetailResponse> UpdateAsync(
        long questionId,
        UpdateQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireManageScope(_currentUser);
        QuestionBankGuard.ValidateUpdateRequest(request);

        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);
        await EnsureCanUpdateAsync(question, scope, cancellationToken);

        var questionTypeId = await _guard.ResolveQuestionTypeIdAsync(request.QuestionType, cancellationToken);
        var difficultyLevelId = await _guard.ResolveDifficultyLevelIdAsync(request.DifficultyLevel, cancellationToken);
        question.UpdateDetails(
            request.QuestionText,
            questionTypeId,
            request.ClassId,
            request.SubjectId,
            request.TopicId,
            difficultyLevelId,
            request.EstimatedTimeSeconds,
            request.Marks,
            request.Hint,
            request.Explanation);

        // Explicit SubmitForReview is required to move Rejected → PendingReview.
        await ReplaceAnswersAsync(
            questionId,
            request.QuestionType,
            request.Options,
            request.AcceptedAnswers,
            cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var detail = await RequireQuestionDetailAsync(questionId, cancellationToken);
        return QuestionMapping.ToDetailResponse(detail);
    }

    public async Task<QuestionDetailResponse> SubmitForReviewAsync(
        long questionId,
        CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireManageScope(_currentUser);
        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);

        if (!scope.IsPortalAdmin)
        {
            QuestionScopeResolver.EnsureIsOwner(question, scope);
        }

        var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        if (IsApprovedStatus(statusName) || IsArchivedStatus(statusName))
        {
            throw new BusinessRuleException("Approved or archived questions cannot be submitted for review.");
        }

        var pendingStatusId = await RequirePendingReviewStatusIdAsync(cancellationToken);
        question.SubmitForApproval(pendingStatusId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var detail = await RequireQuestionDetailAsync(questionId, cancellationToken);
        return QuestionMapping.ToDetailResponse(detail);
    }

    public async Task<QuestionApprovalResponse> ApproveAsync(long questionId, CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireApprovalScope(_currentUser);
        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);
        await EnsurePendingReviewAsync(question, cancellationToken);

        var approvedStatusId = await RequireApprovedStatusIdAsync(cancellationToken);
        question.Approve(scope.UserId.ToString(), approvedStatusId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var statusName = await _lookups.GetLookupNameAsync(approvedStatusId, cancellationToken);
        return ToApprovalResponse(questionId, statusName, question);
    }

    public async Task<QuestionApprovalResponse> RejectAsync(
        long questionId,
        RejectQuestionRequest request,
        CancellationToken cancellationToken)
    {
        QuestionScopeResolver.RequireApprovalScope(_currentUser);
        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);
        await EnsurePendingReviewAsync(question, cancellationToken);

        var reason = request.Reason?.Trim() ?? string.Empty;
        if (reason.Length < MinRejectionReasonLength)
        {
            throw new ValidationAppException(
            [
                $"Rejection reason is required (at least {MinRejectionReasonLength} characters)."
            ]);
        }

        var rejectedStatusId = await RequireRejectedStatusIdAsync(cancellationToken);
        question.Reject(rejectedStatusId, reason);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var statusName = await _lookups.GetLookupNameAsync(rejectedStatusId, cancellationToken);
        return ToApprovalResponse(questionId, statusName, question);
    }

    public async Task<QuestionActiveStateResponse> ActivateAsync(long questionId, CancellationToken cancellationToken)
    {
        QuestionScopeResolver.RequireLifecycleScope(_currentUser);
        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);
        await EnsureApprovedAsync(question, cancellationToken);

        question.Activate();
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        return new QuestionActiveStateResponse(questionId, question.IsActive, statusName);
    }

    public async Task<QuestionActiveStateResponse> DeactivateAsync(long questionId, CancellationToken cancellationToken)
    {
        QuestionScopeResolver.RequireLifecycleScope(_currentUser);
        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);
        // Soft-hide quiz use while keeping Approved status; non-Approved must stay inactive.
        await EnsureApprovedAsync(question, cancellationToken);

        question.Deactivate();
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        return new QuestionActiveStateResponse(questionId, question.IsActive, statusName);
    }

    public async Task<QuestionActiveStateResponse> ArchiveAsync(long questionId, CancellationToken cancellationToken)
    {
        QuestionScopeResolver.RequireLifecycleScope(_currentUser);
        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);

        var archivedStatusId = await RequireArchivedStatusIdAsync(cancellationToken);
        question.Archive(archivedStatusId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var statusName = await _lookups.GetLookupNameAsync(archivedStatusId, cancellationToken);
        return new QuestionActiveStateResponse(questionId, question.IsActive, statusName);
    }

    public async Task<DeleteQuestionResponse> DeleteAsync(long questionId, CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireManageScope(_currentUser);
        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);
        await EnsureCanDeleteAsync(question, scope, cancellationToken);

        var linkCount = await _questions.CountQuizLinksAsync(questionId, cancellationToken);
        if (linkCount > 0)
        {
            throw new BusinessRuleException(
                "Question is linked to one or more quizzes. Remove it from quizzes before deleting.");
        }

        await _questions.RemoveQuestionOptionsAsync(questionId, cancellationToken);
        await _questions.RemoveQuestionAcceptedAnswersAsync(questionId, cancellationToken);
        await _questions.DeleteQuestionAsync(question, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new DeleteQuestionResponse(questionId, Deleted: true, Deactivated: false);
    }

    public async Task<ImportQuestionsResponse> ImportAsync(
        IReadOnlyList<QuestionExcelImportRow> rows,
        bool dryRun,
        CancellationToken cancellationToken)
    {
        QuestionScopeResolver.RequireManageScope(_currentUser);

        if (rows.Count == 0)
        {
            throw new ValidationAppException(["Import file has no question rows."]);
        }

        if (rows.Count > 200)
        {
            throw new ValidationAppException(["Import is limited to 200 rows per file."]);
        }

        var errors = new List<ImportQuestionRowError>();
        var created = new List<QuestionDetailResponse>();

        for (var index = 0; index < rows.Count; index++)
        {
            var rowNumber = index + 2; // header = row 1
            var draft = rows[index];
            try
            {
                var classId = await ResolveRequiredLookupTokenAsync(
                    "Class",
                    draft.ClassToken,
                    cancellationToken);
                var subjectId = await ResolveRequiredLookupTokenAsync(
                    "Subject",
                    draft.SubjectToken,
                    cancellationToken);
                short? topicId = null;
                if (draft.TopicToken.HasTrimmedText())
                {
                    topicId = await ResolveRequiredLookupTokenAsync(
                        "Topic",
                        draft.TopicToken!,
                        cancellationToken);
                }

                // Always PendingReview (no Draft). Status column ignored for create path.
                var request = new CreateQuestionRequest(
                    draft.QuestionText,
                    draft.QuestionType,
                    classId,
                    subjectId,
                    topicId,
                    draft.DifficultyLevel,
                    draft.Marks,
                    draft.EstimatedTimeSeconds,
                    draft.Hint,
                    draft.Explanation,
                    draft.Options,
                    draft.AcceptedAnswers,
                    SubmitForReview: true);

                QuestionBankGuard.ValidateCreateRequest(request);
                await _guard.ResolveQuestionTypeIdAsync(request.QuestionType, cancellationToken);
                await _guard.ResolveDifficultyLevelIdAsync(request.DifficultyLevel, cancellationToken);

                if (!dryRun)
                {
                    var detail = await CreateAsync(request, cancellationToken);
                    created.Add(detail);
                }
            }
            catch (ValidationAppException ex)
            {
                errors.Add(new ImportQuestionRowError(rowNumber, string.Join(" ", ex.Errors)));
            }
            catch (AppException ex)
            {
                errors.Add(new ImportQuestionRowError(rowNumber, ex.Message));
            }
            catch (Exception ex)
            {
                errors.Add(new ImportQuestionRowError(rowNumber, ex.Message));
            }
        }

        return new ImportQuestionsResponse(
            DryRun: dryRun,
            CreatedCount: created.Count,
            ErrorCount: errors.Count,
            Created: created,
            Errors: errors);
    }

    private async Task<short> ResolveRequiredLookupTokenAsync(
        string lookupType,
        string token,
        CancellationToken cancellationToken)
    {
        if (!token.HasTrimmedText())
        {
            throw new ValidationAppException([$"{lookupType} is required (name or ID)."]);
        }

        var id = await _lookups.ResolveLookupIdOrNameAsync(lookupType, token, cancellationToken);
        if (id == 0)
        {
            throw new ValidationAppException([
                $"{lookupType} '{token}' was not found. Use a valid lookup name or ID."
            ]);
        }

        return id;
    }

    private async Task EnsureCanUpdateAsync(
        Question question,
        QuestionManageScope scope,
        CancellationToken cancellationToken)
    {
        if (scope.IsPortalAdmin)
        {
            return;
        }

        QuestionScopeResolver.EnsureIsOwner(question, scope);
        var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        if (!IsOwnerEditableStatus(statusName))
        {
            throw new BusinessRuleException(
                "You can only update your own questions before Portal Admin approval (or after rejection).");
        }
    }

    private async Task EnsureCanDeleteAsync(
        Question question,
        QuestionManageScope scope,
        CancellationToken cancellationToken)
    {
        if (scope.IsPortalAdmin)
        {
            return;
        }

        QuestionScopeResolver.EnsureIsOwner(question, scope);
        var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        if (!IsOwnerEditableStatus(statusName))
        {
            throw new BusinessRuleException(
                "You can only delete your own PendingReview or Rejected questions. Approved questions can only be deleted by Portal Admin.");
        }
    }

    private async Task ReplaceAnswersAsync(
        long questionId,
        string questionType,
        IReadOnlyList<QuestionOptionRequest> options,
        IReadOnlyList<QuestionAcceptedAnswerRequest>? acceptedAnswers,
        CancellationToken cancellationToken)
    {
        if (QuizQuestionHelper.IsFillBlankType(questionType))
        {
            await _questions.RemoveQuestionOptionsAsync(questionId, cancellationToken);
            await _questions.RemoveQuestionAcceptedAnswersAsync(questionId, cancellationToken);

            var answers = ResolveFillAcceptedAnswers(options, acceptedAnswers)
                .Select(answer => new QuestionAcceptedAnswer(
                    questionId,
                    answer.AnswerText,
                    answer.IsCaseSensitive,
                    answer.AllowPartialMatch,
                    answer.MinimumLength,
                    answer.MaximumLength,
                    answer.AllowAiReview,
                    answer.AllowTeacherReview))
                .ToArray();

            if (answers.Length > 0)
            {
                await _questions.AddQuestionAcceptedAnswersAsync(answers, cancellationToken);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return;
        }

        await _questions.RemoveQuestionAcceptedAnswersAsync(questionId, cancellationToken);
        await ReplaceOptionsAsync(questionId, options, cancellationToken);
    }

    private static IReadOnlyList<QuestionAcceptedAnswerRequest> ResolveFillAcceptedAnswers(
        IReadOnlyList<QuestionOptionRequest> options,
        IReadOnlyList<QuestionAcceptedAnswerRequest>? acceptedAnswers)
    {
        var fromAccepted = (acceptedAnswers ?? Array.Empty<QuestionAcceptedAnswerRequest>())
            .Where(answer => !string.IsNullOrWhiteSpace(answer.AnswerText))
            .ToArray();

        if (fromAccepted.Length > 0)
        {
            return fromAccepted;
        }

        // Legacy Excel / clients that still send Fill answers as options.
        return options
            .Where(option => !string.IsNullOrWhiteSpace(option.OptionText))
            .Select(option => new QuestionAcceptedAnswerRequest(option.OptionText.Trim()))
            .ToArray();
    }

    private async Task ReplaceOptionsAsync(
        long questionId,
        IReadOnlyList<QuestionOptionRequest> options,
        CancellationToken cancellationToken)
    {
        await _questions.RemoveQuestionOptionsAsync(questionId, cancellationToken);
        if (options.Count == 0)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return;
        }

        var entities = options
            .Select(option => new QuestionOption(questionId, option.OptionText, option.IsCorrect))
            .ToArray();
        await _questions.AddQuestionOptionsAsync(entities, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<Question> RequireQuestionEntityAsync(long questionId, CancellationToken cancellationToken)
        => await _questions.GetQuestionEntityForManageAsync(questionId, cancellationToken)
            ?? throw new NotFoundAppException("Question was not found.");

    private async Task<QuestionDetailItem> RequireQuestionDetailAsync(
        long questionId,
        CancellationToken cancellationToken)
        => await _questions.GetQuestionDetailAsync(questionId, cancellationToken)
            ?? throw new NotFoundAppException("Question was not found.");

    private async Task EnsurePendingReviewAsync(Question question, CancellationToken cancellationToken)
    {
        var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        if (!IsPendingReviewStatus(statusName))
        {
            throw new BusinessRuleException("Only PendingReview questions can be approved or rejected.");
        }
    }

    private async Task EnsureApprovedAsync(Question question, CancellationToken cancellationToken)
    {
        var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        if (!IsApprovedStatus(statusName))
        {
            throw new BusinessRuleException("Only approved questions can be activated.");
        }
    }

    private static QuestionApprovalResponse ToApprovalResponse(
        long questionId,
        string statusName,
        Question question)
        => new(
            questionId,
            statusName,
            question.IsActive,
            question.ApprovedBy,
            question.IsAiApproved,
            question.RejectionReason);

    private static void EnsureCanView(QuestionDetailItem detail, QuestionManageScope scope)
    {
        if (scope.IsPortalAdmin)
        {
            return;
        }

        if (string.Equals(detail.CreatedBy, scope.UserId.ToString(), StringComparison.Ordinal))
        {
            return;
        }

        if (IsApprovedStatus(detail.StatusName))
        {
            return;
        }

        throw new ForbiddenAppException("You do not have access to this question.");
    }

    private static bool IsPendingReviewStatus(string statusName)
        => QuizLookupNames.IsPendingQuestionStatusName(statusName);

    private static bool IsApprovedStatus(string statusName)
        => QuizLookupNames.IsApprovedQuestionStatusName(statusName);

    private static bool IsArchivedStatus(string statusName)
        => QuizLookupNames.IsArchivedQuestionStatusName(statusName);

    private static bool IsOwnerEditableStatus(string statusName)
        => QuizLookupNames.IsOwnerEditableQuestionStatusName(statusName);

    private Task<short> RequirePendingReviewStatusIdAsync(CancellationToken cancellationToken)
        => RequireQuestionStatusIdAsync(
            QuizLookupNames.QuestionStatusIds.PendingReview,
            QuizLookupNames.PendingQuestionStatusNames,
            cancellationToken);

    private Task<short> RequireApprovedStatusIdAsync(CancellationToken cancellationToken)
        => RequireQuestionStatusIdAsync(
            QuizLookupNames.QuestionStatusIds.Approved,
            QuizLookupNames.ApprovedQuestionStatusNames,
            cancellationToken);

    private Task<short> RequireRejectedStatusIdAsync(CancellationToken cancellationToken)
        => RequireQuestionStatusIdAsync(
            QuizLookupNames.QuestionStatusIds.Rejected,
            QuizLookupNames.RejectedQuestionStatusNames,
            cancellationToken);

    private Task<short> RequireArchivedStatusIdAsync(CancellationToken cancellationToken)
        => RequireQuestionStatusIdAsync(
            QuizLookupNames.QuestionStatusIds.Archived,
            QuizLookupNames.ArchivedQuestionStatusNames,
            cancellationToken);

    private async Task<short> RequireQuestionStatusIdAsync(
        short preferredId,
        IReadOnlyList<string> canonicalNames,
        CancellationToken cancellationToken)
    {
        var preferred = await _lookups.GetByIdAndTypeAsync(
            preferredId,
            QuizLookupNames.QuestionStatus,
            cancellationToken);

        if (preferred is not null)
        {
            return preferred.Id;
        }

        return await _guard.RequireLookupAsync(
            QuizLookupNames.QuestionStatus,
            canonicalNames,
            cancellationToken);
    }
}
