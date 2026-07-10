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

    Task<QuestionApprovalResponse> ApproveAsync(long questionId, CancellationToken cancellationToken);

    Task<QuestionApprovalResponse> ApproveAiAsync(long questionId, CancellationToken cancellationToken);

    Task<QuestionApprovalResponse> RejectAsync(
        long questionId,
        RejectQuestionRequest request,
        CancellationToken cancellationToken);

    Task<QuestionActiveStateResponse> ActivateAsync(long questionId, CancellationToken cancellationToken);

    Task<QuestionActiveStateResponse> DeactivateAsync(long questionId, CancellationToken cancellationToken);

    Task<DeleteQuestionResponse> DeleteAsync(long questionId, CancellationToken cancellationToken);
}

public sealed class QuestionService : IQuestionService
{
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
        var createdByUserId = scope.CanApprove ? (long?)null : scope.UserId;
        var items = await _questions.ListQuestionsAsync(
            createdByUserId,
            isActive,
            subjectId,
            classId,
            pendingApprovalOnly,
            eligibleForQuizOnly,
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
        var pendingStatusId = await RequirePendingStatusIdAsync(cancellationToken);
        var question = new Question(
            request.QuestionText,
            questionTypeId,
            request.ClassId,
            request.SubjectId,
            request.TopicId,
            request.DifficultyLevel,
            pendingStatusId,
            scope.UserId.ToString(),
            request.EstimatedTimeSeconds,
            request.Marks);

        question.UpdateDetails(
            request.QuestionText,
            questionTypeId,
            request.ClassId,
            request.SubjectId,
            request.TopicId,
            request.DifficultyLevel,
            request.EstimatedTimeSeconds,
            request.Marks,
            request.Hint,
            request.Explanation);

        await _questions.AddQuestionAsync(question, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await ReplaceOptionsAsync(question.Id, request.Options, cancellationToken);

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
        QuestionScopeResolver.EnsureCanModify(question, scope);

        var questionTypeId = await _guard.ResolveQuestionTypeIdAsync(request.QuestionType, cancellationToken);
        question.UpdateDetails(
            request.QuestionText,
            questionTypeId,
            request.ClassId,
            request.SubjectId,
            request.TopicId,
            request.DifficultyLevel,
            request.EstimatedTimeSeconds,
            request.Marks,
            request.Hint,
            request.Explanation);

        if (!scope.CanApprove)
        {
            var pendingStatusId = await RequirePendingStatusIdAsync(cancellationToken);
            question.SubmitForApproval(pendingStatusId);
        }

        await ReplaceOptionsAsync(questionId, request.Options, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var detail = await RequireQuestionDetailAsync(questionId, cancellationToken);
        return QuestionMapping.ToDetailResponse(detail);
    }

    public async Task<QuestionApprovalResponse> ApproveAsync(long questionId, CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireApprovalScope(_currentUser);
        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);
        await EnsurePendingAsync(question, cancellationToken);

        var approvedStatusId = await RequireApprovedStatusIdAsync(cancellationToken);
        question.Approve(scope.UserId.ToString(), approvedStatusId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var statusName = await _lookups.GetLookupNameAsync(approvedStatusId, cancellationToken);
        return ToApprovalResponse(questionId, statusName, question);
    }

    /// <summary>
    /// Second approval step after human approve. Sets <c>IsAiApproved</c> only.
    /// </summary>
    public async Task<QuestionApprovalResponse> ApproveAiAsync(long questionId, CancellationToken cancellationToken)
    {
        QuestionScopeResolver.RequireAiApprovalScope(_currentUser);
        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);
        await EnsureHumanApprovedAsync(question, cancellationToken);

        var questionTypeName = await _lookups.GetLookupNameAsync(question.QuestionTypeId, cancellationToken);
        QuestionAiApprovalValidator.EnsureReadyForAiApproval(question, questionTypeName);

        question.MarkAiApproved();
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        return ToApprovalResponse(questionId, statusName, question);
    }

    public async Task<QuestionApprovalResponse> RejectAsync(
        long questionId,
        RejectQuestionRequest request,
        CancellationToken cancellationToken)
    {
        QuestionScopeResolver.RequireApprovalScope(_currentUser);
        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);
        await EnsurePendingAsync(question, cancellationToken);

        var rejectedStatusId = await RequireRejectedStatusIdAsync(cancellationToken);
        question.Reject(rejectedStatusId, request.Reason);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var statusName = await _lookups.GetLookupNameAsync(rejectedStatusId, cancellationToken);
        return ToApprovalResponse(questionId, statusName, question);
    }

    public async Task<QuestionActiveStateResponse> ActivateAsync(long questionId, CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireManageScope(_currentUser);
        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);
        QuestionScopeResolver.EnsureCanModify(question, scope);
        await EnsureApprovedAsync(question, cancellationToken);

        question.Activate();
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        return new QuestionActiveStateResponse(questionId, question.IsActive, statusName);
    }

    public async Task<QuestionActiveStateResponse> DeactivateAsync(long questionId, CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireManageScope(_currentUser);
        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);
        QuestionScopeResolver.EnsureCanModify(question, scope);

        question.Deactivate();
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        return new QuestionActiveStateResponse(questionId, question.IsActive, statusName);
    }

    public async Task<DeleteQuestionResponse> DeleteAsync(long questionId, CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireManageScope(_currentUser);
        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);
        QuestionScopeResolver.EnsureCanModify(question, scope);

        var linkCount = await _questions.CountQuizLinksAsync(questionId, cancellationToken);
        if (linkCount > 0)
        {
            throw new BusinessRuleException(
                "Question is linked to one or more quizzes. Remove it from quizzes before deleting.");
        }

        if (question.IsActive && !scope.CanApprove)
        {
            var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
            if (!IsPendingStatus(statusName))
            {
                throw new BusinessRuleException(
                    "Active or approved questions must be deactivated before they can be deleted.");
            }
        }

        await _questions.RemoveQuestionOptionsAsync(questionId, cancellationToken);
        await _questions.DeleteQuestionAsync(question, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new DeleteQuestionResponse(questionId, Deleted: true, Deactivated: false);
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

    private async Task EnsurePendingAsync(Question question, CancellationToken cancellationToken)
    {
        var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        if (!IsPendingStatus(statusName))
        {
            throw new BusinessRuleException("Only pending questions can be approved or rejected.");
        }
    }

    private async Task EnsureHumanApprovedAsync(Question question, CancellationToken cancellationToken)
    {
        var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        if (!IsApprovedStatus(statusName) || !question.ApprovedBy.HasTrimmedText())
        {
            throw new BusinessRuleException(
                "Question must be human-approved before AI approval.");
        }

        if (question.IsAiApproved)
        {
            throw new BusinessRuleException("Question is already AI-approved.");
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
        if (scope.CanApprove)
        {
            return;
        }

        if (!string.Equals(detail.CreatedBy, scope.UserId.ToString(), StringComparison.Ordinal))
        {
            throw new ForbiddenAppException("You do not have access to this question.");
        }
    }

    private static bool IsPendingStatus(string statusName)
        => QuizLookupNames.PendingQuestionStatusNames.Any(name =>
            name.Equals(statusName, StringComparison.OrdinalIgnoreCase));

    private static bool IsApprovedStatus(string statusName)
        => QuizLookupNames.ApprovedQuestionStatusNames.Any(name =>
            name.Equals(statusName, StringComparison.OrdinalIgnoreCase));

    private Task<short> RequirePendingStatusIdAsync(CancellationToken cancellationToken)
        => _guard.RequireLookupAsync(
            QuizLookupNames.QuestionStatus,
            QuizLookupNames.PendingQuestionStatusNames,
            cancellationToken);

    private Task<short> RequireApprovedStatusIdAsync(CancellationToken cancellationToken)
        => _guard.RequireLookupAsync(
            QuizLookupNames.QuestionStatus,
            QuizLookupNames.ApprovedQuestionStatusNames,
            cancellationToken);

    private Task<short> RequireRejectedStatusIdAsync(CancellationToken cancellationToken)
        => _guard.RequireLookupAsync(
            QuizLookupNames.QuestionStatus,
            QuizLookupNames.RejectedQuestionStatusNames,
            cancellationToken);
}
