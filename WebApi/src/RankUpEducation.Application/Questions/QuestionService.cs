using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Contracts.Questions;
using RankUpEducation.Domain.Approvals;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Application.Questions;

/// <summary>
/// Question-bank application service: create (PendingReview + org stamp), list with visibility,
/// approve/reject (3-tier visibility), and PortalAdmin-only activate/deactivate/archive.
/// </summary>
public interface IQuestionService
{
    /// <summary>
    /// Lists questions. PortalAdmin sees all; others see own + Public + restricted non-public
    /// (creator's upward admins only). Quiz picker returns only Published (Public + Active).
    /// </summary>
    Task<QuestionListResponse> ListAsync(
        bool? isActive,
        short? subjectId,
        short? classId,
        bool pendingApprovalOnly,
        bool eligibleForQuizOnly,
        CancellationToken cancellationToken);

    /// <summary>Approver queue: PendingReview eligible for the caller's hierarchy (or all for PortalAdmin).</summary>
    Task<QuestionListResponse> ListPendingApprovalAsync(CancellationToken cancellationToken);

    /// <summary>Detail by id; enforces owner / restricted / Public access.</summary>
    Task<QuestionDetailResponse> GetByIdAsync(long questionId, CancellationToken cancellationToken);

    /// <summary>
    /// Creates a question. Non–PortalAdmin → PendingReview (inactive). PortalAdmin → auto-published Public + Active.
    /// Stamps SchoolId/CampusId/CreatedByRole from creator.
    /// </summary>
    Task<QuestionDetailResponse> CreateAsync(CreateQuestionRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// Updates content/answers. Owners may edit PendingReview/Rejected only; does not auto-resubmit.
    /// </summary>
    Task<QuestionDetailResponse> UpdateAsync(
        long questionId,
        UpdateQuestionRequest request,
        CancellationToken cancellationToken);

    /// <summary>
    /// Owner (or PortalAdmin) resubmits Rejected into PendingReview; clears prior endorsement/visibility.
    /// </summary>
    Task<QuestionDetailResponse> SubmitForReviewAsync(long questionId, CancellationToken cancellationToken);

    /// <summary>
    /// CampusAdmin/SchoolAdmin endorse (Approved + Campus/School, Inactive, restricted).
    /// PortalAdmin publishes (Approved + Public + Active). Hierarchy: approver must be higher tier than creator.
    /// PortalAdmin may also publish an already-endorsed question.
    /// </summary>
    Task<QuestionApprovalResponse> ApproveAsync(long questionId, CancellationToken cancellationToken);

    /// <summary>Rejects PendingReview with a required reason; clears endorsement and visibility.</summary>
    Task<QuestionApprovalResponse> RejectAsync(
        long questionId,
        RejectQuestionRequest request,
        CancellationToken cancellationToken);

    /// <summary>PortalAdmin-only: activate a Published (Public) question for quiz use.</summary>
    Task<QuestionActiveStateResponse> ActivateAsync(long questionId, CancellationToken cancellationToken);

    /// <summary>PortalAdmin-only: deactivate a Published question (status stays Approved).</summary>
    Task<QuestionActiveStateResponse> DeactivateAsync(long questionId, CancellationToken cancellationToken);

    /// <summary>PortalAdmin-only: archive and deactivate.</summary>
    Task<QuestionActiveStateResponse> ArchiveAsync(long questionId, CancellationToken cancellationToken);

    /// <summary>
    /// PortalAdmin-only: restore an Archived question.
    /// Public → Approved + Active; Campus/School → Approved + Inactive; None → PendingReview.
    /// </summary>
    Task<QuestionActiveStateResponse> UnarchiveAsync(long questionId, CancellationToken cancellationToken);

    /// <summary>Deletes when not linked to quizzes; owners limited to PendingReview/Rejected.</summary>
    Task<DeleteQuestionResponse> DeleteAsync(long questionId, CancellationToken cancellationToken);

    /// <summary>Bulk create via Excel rows (always PendingReview); dryRun validates without saving.</summary>
    Task<ImportQuestionsResponse> ImportAsync(
        IReadOnlyList<QuestionExcelImportRow> rows,
        bool dryRun,
        CancellationToken cancellationToken);
}

/// <inheritdoc cref="IQuestionService"/>
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

    /// <inheritdoc />
    public async Task<QuestionListResponse> ListAsync(
        bool? isActive,
        short? subjectId,
        short? classId,
        bool pendingApprovalOnly,
        bool eligibleForQuizOnly,
        CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireManageScope(_currentUser);

        // PortalAdmin: all rows. Others: own + Public + restricted non-public for upward admins.
        // Quiz picker: Published (Public) + active only.
        QuestionListVisibilityScope? visibilityScope = null;
        long? createdByUserId = null;

        if (!scope.IsPortalAdmin)
        {
            visibilityScope = new QuestionListVisibilityScope(
                scope.UserId,
                scope.SchoolId,
                scope.CampusId,
                scope.Role);

            if (pendingApprovalOnly && !scope.CanApprove)
            {
                throw new ForbiddenAppException(
                    "Only Portal Admin, School Admin, or Campus Admin can list pending approvals.");
            }
        }

        if (eligibleForQuizOnly && !scope.IsPortalAdmin)
        {
            visibilityScope = new QuestionListVisibilityScope(
                scope.UserId,
                scope.SchoolId,
                scope.CampusId,
                scope.Role);
        }

        var items = await _questions.ListQuestionsAsync(
            createdByUserId,
            isActive,
            subjectId,
            classId,
            pendingApprovalOnly,
            eligibleForQuizOnly,
            visibilityScope,
            cancellationToken);

        return new QuestionListResponse(items.Select(QuestionMapping.ToSummaryResponse).ToArray());
    }

    /// <inheritdoc />
    public async Task<QuestionListResponse> ListPendingApprovalAsync(CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireApprovalScope(_currentUser);
        QuestionListVisibilityScope? visibilityScope = scope.IsPortalAdmin
            ? null
            : new QuestionListVisibilityScope(
                scope.UserId,
                scope.SchoolId,
                scope.CampusId,
                scope.Role);

        var items = await _questions.ListQuestionsAsync(
            createdByUserId: null,
            isActive: null,
            subjectId: null,
            classId: null,
            pendingApprovalOnly: true,
            eligibleForQuizOnly: false,
            visibilityScope,
            cancellationToken);

        return new QuestionListResponse(items.Select(QuestionMapping.ToSummaryResponse).ToArray());
    }

    /// <inheritdoc />
    public async Task<QuestionDetailResponse> GetByIdAsync(long questionId, CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireManageScope(_currentUser);
        var detail = await RequireQuestionDetailAsync(questionId, cancellationToken);
        EnsureCanView(detail, scope);
        return QuestionMapping.ToDetailResponse(detail);
    }

    /// <inheritdoc />
    public async Task<QuestionDetailResponse> CreateAsync(
        CreateQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireManageScope(_currentUser);
        QuestionBankGuard.ValidateCreateRequest(request);

        var questionTypeId = await _guard.ResolveQuestionTypeIdAsync(request.QuestionType, cancellationToken);
        var difficultyLevelId = await _guard.ResolveDifficultyLevelIdAsync(request.DifficultyLevel, cancellationToken);

        // PortalAdmin auto-publishes; everyone else starts in PendingReview.
        var initialStatusId = scope.IsPortalAdmin
            ? await RequireApprovedStatusIdAsync(cancellationToken)
            : await RequirePendingReviewStatusIdAsync(cancellationToken);

        var question = new Question(
            request.QuestionText,
            questionTypeId,
            request.ClassId,
            request.SubjectId,
            request.TopicId,
            difficultyLevelId,
            initialStatusId,
            scope.UserId,
            scope.Role,
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

        // Stamp creator org so Campus/School admins can endorse in scope.
        question.SetOrgScope(scope.SchoolId, scope.CampusId);

        if (scope.IsPortalAdmin)
        {
            question.MarkFullyApproved(
                scope.UserId,
                initialStatusId,
                QuestionVisibilityLevels.Public);
        }
        else
        {
            question.SubmitForApproval(initialStatusId);
        }

        await _questions.AddQuestionAsync(question, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (question.Id <= 0)
        {
            throw new InvalidOperationException(
                "Question was inserted but no database identity was returned. Check questions.id GENERATED ALWAYS AS IDENTITY mapping.");
        }

        await RecordTrailEventAsync(question.Id, scope, ApprovalAction.Created, cancellationToken);
        await RecordTrailEventAsync(
            question.Id,
            scope,
            scope.IsPortalAdmin ? ApprovalAction.Published : ApprovalAction.SubmittedForReview,
            cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Detach so ReplaceAnswersAsync does not reconcile against an empty Options collection
        // on the same tracked parent (can delete newly added options / confuse change tracking).
        _questions.DetachQuestion(question);

        await ReplaceAnswersAsync(
            question.Id,
            request.QuestionType,
            request.Options,
            request.AcceptedAnswers,
            cancellationToken);

        var detail = await RequireQuestionDetailAsync(question.Id, cancellationToken);
        return QuestionMapping.ToDetailResponse(detail);
    }

    /// <inheritdoc />
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
        await RecordTrailEventAsync(questionId, scope, ApprovalAction.Modified, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var detail = await RequireQuestionDetailAsync(questionId, cancellationToken);
        return QuestionMapping.ToDetailResponse(detail);
    }

    /// <inheritdoc />
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
        await RecordTrailEventAsync(questionId, scope, ApprovalAction.SubmittedForReview, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var detail = await RequireQuestionDetailAsync(questionId, cancellationToken);
        return QuestionMapping.ToDetailResponse(detail);
    }

    /// <inheritdoc />
    public async Task<QuestionApprovalResponse> ApproveAsync(long questionId, CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireApprovalScope(_currentUser);
        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);
        await EnsureCanApproveStatusAsync(question, scope, cancellationToken);

        // Backfill missing org from approver when creator had no school/campus (e.g. PortalAdmin).
        if (scope.IsCampusAdmin
            && !question.CampusId.HasValue
            && scope.CampusId.HasValue
            && (!question.SchoolId.HasValue || question.SchoolId == scope.SchoolId))
        {
            question.SetOrgScope(scope.SchoolId ?? question.SchoolId, scope.CampusId);
        }
        else if (scope.IsSchoolAdmin && !question.SchoolId.HasValue && scope.SchoolId.HasValue)
        {
            question.SetOrgScope(scope.SchoolId, question.CampusId);
        }

        QuestionScopeResolver.EnsureCanApproveOrReject(question, scope);

        var approvedStatusId = await RequireApprovedStatusIdAsync(cancellationToken);
        // CampusAdmin/SchoolAdmin → endorse (Inactive). PortalAdmin → publish (Public + Active).
        question.Approve(
            scope.UserId,
            approvedStatusId,
            scope.ApprovalVisibilityLevel,
            publish: scope.ApprovalPublishes);
        await RecordTrailEventAsync(
            questionId,
            scope,
            scope.ApprovalPublishes ? ApprovalAction.Published : ApprovalAction.Endorsed,
            cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var statusName = await _lookups.GetLookupNameAsync(approvedStatusId, cancellationToken);
        var detail = await RequireQuestionDetailAsync(questionId, cancellationToken);
        return new QuestionApprovalResponse(
            questionId,
            statusName,
            question.IsActive,
            detail.ApprovedBy,
            detail.ApprovedByName,
            question.IsAiApproved,
            QuestionVisibilityLevels.ToName(question.VisibilityLevel),
            question.RejectionReason);
    }

    /// <inheritdoc />
    public async Task<QuestionApprovalResponse> RejectAsync(
        long questionId,
        RejectQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireApprovalScope(_currentUser);
        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);
        QuestionScopeResolver.EnsureCanApproveOrReject(question, scope);
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
        await RecordTrailEventAsync(questionId, scope, ApprovalAction.Rejected, cancellationToken, reason);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var statusName = await _lookups.GetLookupNameAsync(rejectedStatusId, cancellationToken);
        return ToApprovalResponse(questionId, statusName, question);
    }

    /// <inheritdoc />
    public async Task<QuestionActiveStateResponse> ActivateAsync(long questionId, CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireLifecycleScope(_currentUser);
        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);
        await EnsureApprovedAsync(question, cancellationToken);

        question.Activate();
        await RecordTrailEventAsync(questionId, scope, ApprovalAction.Activated, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        return new QuestionActiveStateResponse(questionId, question.IsActive, statusName);
    }

    /// <inheritdoc />
    public async Task<QuestionActiveStateResponse> DeactivateAsync(long questionId, CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireLifecycleScope(_currentUser);
        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);
        // Soft-hide quiz use while keeping Approved status; non-Approved must stay inactive.
        await EnsureApprovedAsync(question, cancellationToken);

        question.Deactivate();
        await RecordTrailEventAsync(questionId, scope, ApprovalAction.Deactivated, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        return new QuestionActiveStateResponse(questionId, question.IsActive, statusName);
    }

    /// <inheritdoc />
    public async Task<QuestionActiveStateResponse> ArchiveAsync(long questionId, CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireLifecycleScope(_currentUser);
        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);

        var archivedStatusId = await RequireArchivedStatusIdAsync(cancellationToken);
        question.Archive(archivedStatusId);
        await RecordTrailEventAsync(questionId, scope, ApprovalAction.Archived, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var statusName = await _lookups.GetLookupNameAsync(archivedStatusId, cancellationToken);
        return new QuestionActiveStateResponse(questionId, question.IsActive, statusName);
    }

    /// <inheritdoc />
    public async Task<QuestionActiveStateResponse> UnarchiveAsync(long questionId, CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireLifecycleScope(_currentUser);
        var question = await RequireQuestionEntityAsync(questionId, cancellationToken);

        var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        if (!IsArchivedStatus(statusName))
        {
            throw new BusinessRuleException("Only archived questions can be unarchived.");
        }

        // Preserve pre-archive endorsement / publish marker; pending/rejected had None.
        var restoredStatusId = QuestionVisibilityLevels.IsValidApprovedLevel(question.VisibilityLevel)
            ? await RequireApprovedStatusIdAsync(cancellationToken)
            : await RequirePendingReviewStatusIdAsync(cancellationToken);

        question.Unarchive(restoredStatusId);
        await RecordTrailEventAsync(questionId, scope, ApprovalAction.Unarchived, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var restoredName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        return new QuestionActiveStateResponse(questionId, question.IsActive, restoredName);
    }

    /// <inheritdoc />
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

    /// <inheritdoc />
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

    /// <summary>PortalAdmin any; owners only while PendingReview or Rejected.</summary>
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
                "You can only update your own questions before admin approval (or after rejection).");
        }
    }

    /// <summary>PortalAdmin any; owners only while PendingReview or Rejected.</summary>
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

    /// <summary>Replaces choice options or fill accepted answers based on question type.</summary>
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

    /// <summary>Prefers AcceptedAnswers; falls back to Options for legacy Fill Excel imports.</summary>
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
            .Select(option => new QuestionOption(
                questionId,
                option.OptionText,
                option.IsCorrect,
                option.OptionImageUrl))
            .ToArray();
        await _questions.AddQuestionOptionsAsync(entities, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <summary>Queues one app_approval trail row; persisted by the caller's SaveChanges.</summary>
    private Task RecordTrailEventAsync(
        long questionId,
        QuestionManageScope scope,
        ApprovalAction action,
        CancellationToken cancellationToken,
        string? reason = null)
        => _questions.AddApprovalEventAsync(
            Approval.RecordQuestionEvent(
                questionId,
                scope.UserId,
                scope.Role,
                action,
                DateTimeOffset.UtcNow,
                reason),
            cancellationToken);

    private async Task<Question> RequireQuestionEntityAsync(long questionId, CancellationToken cancellationToken)
        => await _questions.GetQuestionEntityForManageAsync(questionId, cancellationToken)
            ?? throw new NotFoundAppException($"Question #{questionId} was not found.");

    private async Task<QuestionDetailItem> RequireQuestionDetailAsync(
        long questionId,
        CancellationToken cancellationToken)
        => await _questions.GetQuestionDetailAsync(questionId, cancellationToken)
            ?? throw new NotFoundAppException($"Question #{questionId} was not found.");

    private async Task EnsurePendingReviewAsync(Question question, CancellationToken cancellationToken)
    {
        var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        if (!IsPendingReviewStatus(statusName))
        {
            throw new BusinessRuleException("Only PendingReview questions can be approved or rejected.");
        }
    }

    /// <summary>
    /// CampusAdmin/SchoolAdmin may endorse PendingReview only.
    /// PortalAdmin may publish PendingReview or an already-endorsed (non-Public Approved) question.
    /// </summary>
    private async Task EnsureCanApproveStatusAsync(
        Question question,
        QuestionManageScope scope,
        CancellationToken cancellationToken)
    {
        var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        if (IsPendingReviewStatus(statusName))
        {
            return;
        }

        if (scope.IsPortalAdmin
            && IsApprovedStatus(statusName)
            && !QuestionVisibilityLevels.IsPublished(question.VisibilityLevel))
        {
            return;
        }

        throw new BusinessRuleException(
            scope.IsPortalAdmin
                ? "Only PendingReview or endorsed (non-Public) questions can be published."
                : "Only PendingReview questions can be endorsed.");
    }

    private async Task EnsureApprovedAsync(Question question, CancellationToken cancellationToken)
    {
        var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        if (!IsApprovedStatus(statusName))
        {
            throw new BusinessRuleException("Only approved questions can be activated or deactivated.");
        }

        if (!QuestionVisibilityLevels.IsPublished(question.VisibilityLevel))
        {
            throw new BusinessRuleException(
                "Only published (Public) questions can be activated or deactivated.");
        }
    }

    private static QuestionApprovalResponse ToApprovalResponse(
        long questionId,
        string statusName,
        Question question,
        string? approvedByName = null)
        => new(
            questionId,
            statusName,
            question.IsActive,
            question.ApprovedBy?.ToString(),
            approvedByName,
            question.IsAiApproved,
            QuestionVisibilityLevels.ToName(question.VisibilityLevel),
            question.RejectionReason);

    /// <summary>
    /// Access: PortalAdmin any; owner any own row; Public for all managers;
    /// non-Public only for creator's upward CampusAdmin/SchoolAdmin.
    /// </summary>
    private static void EnsureCanView(QuestionDetailItem detail, QuestionManageScope scope)
    {
        if (!long.TryParse(detail.CreatedBy, out var createdByUserId))
        {
            throw new ForbiddenAppException("You do not have access to this question.");
        }

        if (QuestionScopeResolver.CanViewQuestion(
                createdByUserId,
                detail.CreatedByRole,
                detail.VisibilityLevel,
                detail.SchoolId,
                detail.CampusId,
                scope))
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
