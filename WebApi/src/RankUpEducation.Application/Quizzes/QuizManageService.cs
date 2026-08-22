using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Lookups;
using RankUpEducation.Application.Notifications;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Contracts.Quizzes;
using RankUpEducation.Domain.Approvals;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Questions;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

/// <summary>
/// Quiz authoring and lifecycle: create/update/delete drafts, publish (teacher → pending approval,
/// parent → direct publish), approve/reject, duplicate, and archive.
/// </summary>
public interface IQuizManageService
{
    /// <summary>Creates a draft quiz stamped with school/campus from teacher context or linked child.</summary>
    Task<ManageQuizResponse> CreateAsync(CreateQuizRequest request, CancellationToken cancellationToken);

    /// <summary>Updates quiz metadata while draft/published and no assignment window has started.</summary>
    Task<ManageQuizResponse> UpdateAsync(long quizId, UpdateQuizRequest request, CancellationToken cancellationToken);

    /// <summary>Permanently deletes a draft quiz with no assignments or attempts.</summary>
    Task DeleteAsync(long quizId, CancellationToken cancellationToken);

    /// <summary>
    /// Teachers/parents submit draft quizzes for approval; portal admin publishes to the catalog.
    /// </summary>
    Task<ManageQuizResponse> PublishAsync(long quizId, CancellationToken cancellationToken);

    /// <summary>Returns full manage view including attached questions for the quiz owner.</summary>
    Task<ManageQuizResponse> GetManageDetailAsync(long quizId, CancellationToken cancellationToken);

    /// <summary>
    /// Clones quiz metadata and reuses the same question-bank rows (no question insert).
    /// Visibility is raised only when the caller's tier is higher (Public &gt; School &gt; Campus).
    /// </summary>
    Task<DuplicateQuizResponse> DuplicateAsync(long quizId, CancellationToken cancellationToken);

    /// <summary>
    /// Archives a started quiz. When the quiz is unassigned or not started yet, permanently deletes it instead.
    /// </summary>
    Task<ArchiveQuizResponse> ArchiveAsync(long quizId, CancellationToken cancellationToken);

    /// <summary>Restores an archived quiz to Published (no assignments) or Assigned (has assignments).</summary>
    Task<UnarchiveQuizResponse> UnarchiveAsync(long quizId, CancellationToken cancellationToken);

    /// <summary>School admin approves a teacher quiz pending approval.</summary>
    Task<ApproveQuizResponse> ApproveAsync(long quizId, CancellationToken cancellationToken);

    /// <summary>School admin rejects a pending teacher quiz.</summary>
    Task<RejectQuizResponse> RejectAsync(
        long quizId,
        RejectQuizRequest request,
        CancellationToken cancellationToken);

    /// <summary>Lists teacher quizzes awaiting school approval (scoped by school for SchoolAdmin).</summary>
    Task<PendingQuizApprovalListResponse> ListPendingApprovalAsync(CancellationToken cancellationToken);
}

/// <inheritdoc cref="IQuizManageService"/>
public sealed class QuizManageService : IQuizManageService
{
    private readonly IQuizRepository _quizzes;
    private readonly IQuizQuestionRepository _quizQuestions;
    private readonly IQuestionRepository _questions;
    private readonly ILookupRepository _lookups;
    private readonly IStudentScopeRepository _studentScope;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IUserRepository _users;
    private readonly INotificationService _notifications;
    private readonly IQuizEditRequestService _editRequestService;
    private readonly QuizManageGuard _guard;

    public QuizManageService(
        IQuizRepository quizzes,
        IQuizQuestionRepository quizQuestions,
        IQuestionRepository questions,
        ILookupRepository lookups,
        IStudentScopeRepository studentScope,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IUserRepository users,
        INotificationService notifications,
        IQuizEditRequestRepository editRequests,
        IQuizEditRequestService editRequestService)
    {
        _quizzes = quizzes;
        _quizQuestions = quizQuestions;
        _questions = questions;
        _lookups = lookups;
        _studentScope = studentScope;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _users = users;
        _notifications = notifications;
        _editRequestService = editRequestService;
        _guard = new QuizManageGuard(quizzes, lookups, editRequests, users);
    }

    public async Task<ManageQuizResponse> CreateAsync(CreateQuizRequest request, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        ValidateCreateRequest(request);

        var schoolContext = await ResolveSchoolContextAsync(
            scope,
            request.ContextStudentId,
            request.SchoolId,
            request.CampusId,
            cancellationToken);
        var draftStatusId = await _guard.RequireLookupAsync(
            LookupNames.QuizLifecycleStatus,
            LookupNames.DraftLifecycleNames,
            cancellationToken);
        var quizTypeId = await ResolveQuizTypeIdForCreateAsync(scope, request.QuizTypeId, cancellationToken);
        var approvalStatusId = await ResolveInitialApprovalStatusIdAsync(scope, cancellationToken);

        var quiz = new Quiz(
            schoolContext.SchoolId,
            schoolContext.CampusId,
            request.Title,
            request.Description,
            quizTypeId,
            request.ClassId,
            request.SubjectId,
            OptionalLookupId(request.TopicId),
            OptionalLookupId(request.DifficultyLevelId),
            0,
            request.Instructions,
            scope.UserId.ToString(),
            approvalStatusId,
            draftStatusId);

        quiz.UpdateDetails(
            request.Title,
            request.Description,
            request.ClassId,
            request.SubjectId,
            OptionalLookupId(request.TopicId),
            OptionalLookupId(request.DifficultyLevelId),
            request.Instructions,
            null,
            request.AllowedAttempts,
            request.ShuffleQuestions,
            request.ShuffleOptions,
            request.IsReviewRequired,
            request.NavigationMode,
            QuizReviewDisplay.Full,
            request.RandomQuestionCount);

        var quizTypeName = await _lookups.GetLookupNameAsync(quizTypeId, cancellationToken);
        QuizTypeBehavior.ApplyCreateDefaults(quiz, quizTypeName, request.NavigationMode);

        await _quizzes.AddQuizAsync(quiz, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await RecordTrailEventAsync(quiz.Id, scope, ApprovalAction.Created, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await BuildManageResponseAsync(quiz.Id, cancellationToken);
    }

    public async Task<ManageQuizResponse> UpdateAsync(
        long quizId,
        UpdateQuizRequest request,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        var editable = await _guard.RequireEditableQuizContextAsync(quizId, scope, cancellationToken);
        var quiz = editable.Quiz;

        QuizQuestionSelection.ValidateRandomQuestionCount(request.RandomQuestionCount, quiz.TotalQuestions);

        // Time limit is derived from question estimated times — never overwrite from the form.
        quiz.UpdateDetails(
            request.Title,
            request.Description,
            request.ClassId,
            request.SubjectId,
            OptionalLookupId(request.TopicId),
            OptionalLookupId(request.DifficultyLevelId),
            request.Instructions,
            quiz.TimeLimitMinutes,
            request.AllowedAttempts,
            request.ShuffleQuestions,
            request.ShuffleOptions,
            request.IsReviewRequired,
            request.NavigationMode,
            QuizReviewDisplay.Full,
            request.RandomQuestionCount);

        await _quizQuestions.RecalculateQuizTotalsAsync(quizId, cancellationToken);
        var refreshed = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");
        QuizQuestionSelection.ValidateRandomQuestionCount(refreshed.RandomQuestionCount, refreshed.TotalQuestions);
        await RecordTrailEventAsync(quizId, scope, ApprovalAction.Modified, cancellationToken);
        if (editable.Grant is not null)
        {
            await _guard.ConsumeEditGrantAsync(quiz, editable.Grant, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await BuildManageResponseAsync(quizId, cancellationToken);
    }

    public async Task DeleteAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        var quiz = await _guard.RequireOwnedQuizAsync(quizId, scope, cancellationToken);
        await _guard.EnsureDraftOnlyAsync(quiz, cancellationToken);

        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        var approvalName = await _lookups.GetLookupNameAsync(quiz.ApprovalStatusId, cancellationToken);
        var isParentPrivate = await _quizzes.IsParentPrivateQuizTypeAsync(quiz.QuizTypeId, cancellationToken);
        QuizDeleteArchiveRules.EnsureCanDeleteOrArchive(
            quiz,
            scope,
            lifecycleName,
            approvalName,
            isParentPrivate);

        if (await _quizzes.HasAnyAssignmentsAsync(quizId, cancellationToken)
            || await _quizzes.HasAnyAttemptsAsync(quizId, cancellationToken))
        {
            throw new BusinessRuleException("Quiz cannot be deleted after assignments or attempts exist.");
        }

        await _quizzes.DeleteQuizAsync(quiz, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<ManageQuizResponse> PublishAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");

        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        if (!IsDraftLifecycle(lifecycleName))
        {
            throw new BusinessRuleException("Quiz is already published.");
        }

        var isParentPrivate = await _quizzes.IsParentPrivateQuizTypeAsync(quiz.QuizTypeId, cancellationToken);

        if (scope.Role is UserRole.Teacher or UserRole.Coordinator or UserRole.Parent
            or UserRole.Tutor or UserRole.SchoolAdmin or UserRole.CampusAdmin)
        {
            await _guard.RequireEditableQuizAsync(quizId, scope, cancellationToken);

            var pendingApprovalStatusId = await _guard.RequireQuizApprovalStatusAsync(
                LookupNames.QuizApprovalStatusIds.Pending,
                LookupNames.PendingApprovalStatusNames,
                cancellationToken);
            quiz.SubmitForReview(pendingApprovalStatusId);
            await RecordTrailEventAsync(quizId, scope, ApprovalAction.SubmittedForReview, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            if (scope.Role is UserRole.Teacher or UserRole.Coordinator)
            {
                await QuizApprovalNotifications.NotifyApproversOnTeacherPublishAsync(
                    _notifications,
                    _users,
                    quiz,
                    scope.UserId,
                    cancellationToken);
            }
            else if (scope.Role == UserRole.CampusAdmin)
            {
                await QuizApprovalNotifications.NotifySchoolAdminsOnCampusAdminSubmitAsync(
                    _notifications,
                    _users,
                    quiz,
                    scope.UserId,
                    cancellationToken);
            }
            else
            {
                await QuizApprovalNotifications.NotifyPortalAdminsOnSubmitForReviewAsync(
                    _notifications,
                    _users,
                    quiz,
                    scope.UserId,
                    cancellationToken);
            }

            return await BuildManageResponseAsync(quizId, cancellationToken);
        }

        if (scope.Role != UserRole.PortalAdmin)
        {
            throw new ForbiddenAppException(
                "Only a portal admin can publish quizzes. School and campus admins approve; they do not publish.");
        }

        await _guard.RequireOwnedQuizAsync(quizId, scope, cancellationToken);

        if (quiz.TotalQuestions <= 0)
        {
            throw new BusinessRuleException("Quiz must contain at least one question before publish.");
        }

        var approvalName = await GetQuizApprovalNameAsync(quiz.ApprovalStatusId, cancellationToken);
        var publishedStatusId = await _guard.RequireLookupAsync(
            LookupNames.QuizLifecycleStatus,
            LookupNames.PublishedLifecycleNames,
            cancellationToken);
        var approvedStatusId = await _guard.RequireQuizApprovalStatusAsync(
            LookupNames.QuizApprovalStatusIds.Approved,
            LookupNames.ApprovedStatusNames,
            cancellationToken);

        var creatorRole = await ResolveQuizCreatorRoleAsync(quiz, cancellationToken);
        var portalOnlyCreator = QuizApprovalRouting.RequiresPortalAdminOnlyReview(creatorRole);
        var hasSubmitted = await _quizzes.HasSubmittedForReviewAsync(quizId, cancellationToken);
        var awaitingReview = LookupNames.IsSubmittedDraftAwaitingReview(
            quiz.ApprovalStatusId,
            approvalName,
            lifecycleName,
            hasSubmitted);

        if (isParentPrivate || portalOnlyCreator)
        {
            if (!LookupNames.IsPendingApproval(quiz.ApprovalStatusId, approvalName)
                && !LookupNames.IsFinalApproved(quiz.ApprovalStatusId, approvalName)
                && !awaitingReview)
            {
                throw new BusinessRuleException(
                    isParentPrivate
                        ? "Parent quizzes must be pending portal review before publish."
                        : "This quiz must be pending portal review or already approved before publish.");
            }
        }
        else if (!LookupNames.IsSchoolApproved(quiz.ApprovalStatusId, approvalName)
            && !LookupNames.IsFinalApproved(quiz.ApprovalStatusId, approvalName))
        {
            throw new BusinessRuleException(
                "Teacher quizzes must be school-approved before portal publish.");
        }

        quiz.Publish(publishedStatusId, approvedStatusId, scope.UserId.ToString());
        await RecordTrailEventAsync(quizId, scope, ApprovalAction.Approved, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await QuizApprovalNotifications.NotifyCreatorOnFinalApprovedAsync(
            _notifications,
            quiz,
            scope.UserId,
            cancellationToken);

        return await BuildManageResponseAsync(quizId, cancellationToken);
    }

    public async Task<ManageQuizResponse> GetManageDetailAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        await _guard.RequireViewableQuizAsync(quizId, scope, cancellationToken);
        return await BuildManageResponseAsync(quizId, cancellationToken);
    }

    public async Task<ApproveQuizResponse> ApproveAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireApprovalScope(GetCurrentUser());
        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");

        EnsureApprovalTargetAccess(
            quiz,
            scope,
            await _quizzes.IsParentPrivateQuizTypeAsync(quiz.QuizTypeId, cancellationToken));

        QuizScopeResolver.EnsureCanApproveOrRejectQuiz(quiz, scope);

        var creatorRole = await ResolveQuizCreatorRoleAsync(quiz, cancellationToken);
        if (scope.Role is UserRole.SchoolAdmin or UserRole.CampusAdmin
            && !QuizApprovalRouting.MayEndorse(scope.Role, creatorRole))
        {
            throw new ForbiddenAppException(QuizApprovalRouting.DescribeSchoolCampusDenied(creatorRole));
        }

        var approvalName = await GetQuizApprovalNameAsync(quiz.ApprovalStatusId, cancellationToken);
        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        var hasSubmitted = await _quizzes.HasSubmittedForReviewAsync(quizId, cancellationToken);
        var awaitingReview = LookupNames.IsSubmittedDraftAwaitingReview(
            quiz.ApprovalStatusId,
            approvalName,
            lifecycleName,
            hasSubmitted);

        if (LookupNames.IsRejectedApprovalName(approvalName))
        {
            throw new BusinessRuleException(
                "Rejected quizzes cannot be approved. The teacher must resubmit the quiz first.");
        }

        if ((LookupNames.IsPendingApproval(quiz.ApprovalStatusId, approvalName) || awaitingReview)
            && !hasSubmitted)
        {
            throw new BusinessRuleException("This quiz has not been submitted for approval.");
        }

        short nextStatusId;
        string nextStatusName;
        if (scope.Role is UserRole.SchoolAdmin or UserRole.CampusAdmin)
        {
            if (!LookupNames.IsPendingApproval(quiz.ApprovalStatusId, approvalName) && !awaitingReview)
            {
                throw new BusinessRuleException("Only pending quizzes can be school-approved.");
            }

            nextStatusId = await _guard.RequireQuizApprovalStatusAsync(
                LookupNames.QuizApprovalStatusIds.SchoolApproved,
                LookupNames.SchoolApprovedStatusNames,
                cancellationToken);
            nextStatusName = "SchoolApproved";
        }
        else
        {
            if (!LookupNames.IsPendingApproval(quiz.ApprovalStatusId, approvalName)
                && !LookupNames.IsSchoolApproved(quiz.ApprovalStatusId, approvalName)
                && !awaitingReview)
            {
                throw new BusinessRuleException(
                    "Only pending or school-approved quizzes can be approved by portal admin.");
            }

            nextStatusId = await _guard.RequireQuizApprovalStatusAsync(
                LookupNames.QuizApprovalStatusIds.Approved,
                LookupNames.ApprovedStatusNames,
                cancellationToken);
            nextStatusName = "Approved";
        }

        quiz.Approve(nextStatusId, scope.UserId.ToString());
        await RecordTrailEventAsync(
            quizId,
            scope,
            scope.Role is UserRole.SchoolAdmin or UserRole.CampusAdmin
                ? ApprovalAction.Endorsed
                : ApprovalAction.Approved,
            cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (scope.Role is UserRole.SchoolAdmin or UserRole.CampusAdmin)
        {
            await QuizApprovalNotifications.NotifyPortalAdminsOnSchoolApprovedAsync(
                _notifications,
                _users,
                quiz,
                scope.UserId,
                cancellationToken);
            await QuizApprovalNotifications.NotifyCreatorOnSchoolEndorsedAsync(
                _notifications,
                quiz,
                scope.UserId,
                cancellationToken);
        }
        else
        {
            await QuizApprovalNotifications.NotifyCreatorOnFinalApprovedAsync(
                _notifications,
                quiz,
                scope.UserId,
                cancellationToken);
        }

        return new ApproveQuizResponse(quizId, nextStatusName, lifecycleName);
    }

    public async Task<RejectQuizResponse> RejectAsync(
        long quizId,
        RejectQuizRequest request,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireApprovalScope(GetCurrentUser());
        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");

        var isParentPrivate = await _quizzes.IsParentPrivateQuizTypeAsync(quiz.QuizTypeId, cancellationToken);
        EnsureApprovalTargetAccess(quiz, scope, isParentPrivate);

        QuizScopeResolver.EnsureCanApproveOrRejectQuiz(quiz, scope);

        var creatorRole = await ResolveQuizCreatorRoleAsync(quiz, cancellationToken);
        if (scope.Role is UserRole.SchoolAdmin or UserRole.CampusAdmin
            && !QuizApprovalRouting.MayEndorse(scope.Role, creatorRole))
        {
            throw new ForbiddenAppException(QuizApprovalRouting.DescribeSchoolCampusDenied(creatorRole));
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new ValidationAppException(["Rejection reason is required."]);
        }

        var approvalName = await GetQuizApprovalNameAsync(quiz.ApprovalStatusId, cancellationToken);
        if (LookupNames.IsRejectedApprovalName(approvalName))
        {
            throw new BusinessRuleException("Quiz is already rejected.");
        }

        if (LookupNames.IsFinalApproved(quiz.ApprovalStatusId, approvalName))
        {
            throw new BusinessRuleException("Fully approved quizzes cannot be rejected.");
        }

        if (!LookupNames.IsPendingApproval(quiz.ApprovalStatusId, approvalName)
            && !LookupNames.IsSchoolApproved(quiz.ApprovalStatusId, approvalName)
            && !LookupNames.IsSubmittedDraftAwaitingReview(
                quiz.ApprovalStatusId,
                approvalName,
                await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken),
                await _quizzes.HasSubmittedForReviewAsync(quizId, cancellationToken)))
        {
            throw new BusinessRuleException("Only pending or school-approved quizzes can be rejected.");
        }

        if (LookupNames.IsPendingApproval(quiz.ApprovalStatusId, approvalName)
            && !await _quizzes.HasSubmittedForReviewAsync(quizId, cancellationToken))
        {
            throw new BusinessRuleException("This quiz has not been submitted for approval.");
        }

        var rejectedStatusId = await _guard.RequireQuizApprovalStatusAsync(
            LookupNames.QuizApprovalStatusIds.Rejected,
            LookupNames.RejectedApprovalStatusNames,
            cancellationToken);

        quiz.Reject(rejectedStatusId, request.Reason);
        await RecordTrailEventAsync(
            quizId,
            scope,
            ApprovalAction.Rejected,
            cancellationToken,
            request.Reason);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await QuizApprovalNotifications.NotifyCreatorOnRejectedAsync(
            _notifications,
            quiz,
            scope.UserId,
            request.Reason,
            cancellationToken);

        var reason = quiz.RejectionReason;
        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        return new RejectQuizResponse(quizId, "Rejected", lifecycleName, reason);
    }

    public async Task<PendingQuizApprovalListResponse> ListPendingApprovalAsync(
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireApprovalScope(GetCurrentUser());
        // PortalAdmin: all schools; submitted Pending + SchoolApproved (includes SchoolAdmin-created).
        // SchoolAdmin/CampusAdmin: Teacher/Coordinator submitted Pending in scope only.
        var schoolId = scope.Role is UserRole.SchoolAdmin or UserRole.CampusAdmin
            ? scope.SchoolId
            : null;
        var campusId = scope.Role == UserRole.CampusAdmin ? scope.CampusId : null;
        var includeSchoolApproved = scope.Role == UserRole.PortalAdmin;
        var items = await _quizzes.ListPendingApprovalAsync(
            schoolId,
            campusId,
            includeSchoolApproved,
            cancellationToken);

        if (scope.Role is UserRole.SchoolAdmin or UserRole.CampusAdmin)
        {
            items = await FilterSchoolCampusPendingQueueAsync(items, scope, cancellationToken);
        }

        return new PendingQuizApprovalListResponse(
            items.Select(item => new PendingQuizApprovalItemResponse(
                item.QuizId,
                item.Title,
                item.CreatedBy,
                item.SchoolName,
                item.SubjectName,
                item.GradeName,
                item.QuizTypeName,
                item.ApprovalStatus,
                item.LifecycleStatus,
                item.TotalQuestions,
                item.ModifiedDate,
                item.RejectionReason)).ToArray());
    }

    private static void EnsureApprovalTargetAccess(
        Quiz quiz,
        QuizManageScope scope,
        bool isParentPrivateQuiz)
    {
        if (isParentPrivateQuiz)
        {
            if (scope.Role != UserRole.PortalAdmin)
            {
                throw new ForbiddenAppException("Only a portal admin can review parent quizzes.");
            }

            return;
        }

        if (scope.Role == UserRole.PortalAdmin)
        {
            return;
        }

        if (scope.Role == UserRole.SchoolAdmin)
        {
            if (quiz.SchoolId != scope.SchoolId)
            {
                throw new ForbiddenAppException("You can only review quizzes in your school.");
            }

            return;
        }

        if (scope.Role == UserRole.CampusAdmin)
        {
            if (quiz.SchoolId != scope.SchoolId || quiz.SchoolCampusId != scope.CampusId)
            {
                throw new ForbiddenAppException("You can only review quizzes in your campus.");
            }
        }
    }
    public async Task<DuplicateQuizResponse> DuplicateAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        var source = await _guard.RequireOwnedQuizAsync(quizId, scope, cancellationToken);
        await _guard.EnsureNotArchivedAsync(source, cancellationToken);

        if (source.TotalQuestions <= 0)
        {
            throw new BusinessRuleException("Quiz must contain at least one question to duplicate.");
        }

        var draftStatusId = await _guard.RequireLookupAsync(
            LookupNames.QuizLifecycleStatus,
            LookupNames.DraftLifecycleNames,
            cancellationToken);
        var pendingApprovalId = await _guard.RequireQuizApprovalStatusAsync(
            LookupNames.QuizApprovalStatusIds.Pending,
            LookupNames.PendingApprovalStatusNames,
            cancellationToken);

        var copyTitle = source.QuizTitle.Length > 92
            ? $"{source.QuizTitle[..92]} (Copy)"
            : $"{source.QuizTitle} (Copy)";

        var copy = new Quiz(
            source.SchoolId,
            source.SchoolCampusId,
            copyTitle,
            source.Description,
            source.QuizTypeId,
            source.ClassId,
            source.SubjectId,
            source.TopicId,
            source.DifficultyLevelId,
            0,
            source.Instructions,
            scope.UserId.ToString(),
            pendingApprovalId,
            draftStatusId);

        copy.UpdateDetails(
            copyTitle,
            source.Description,
            source.ClassId,
            source.SubjectId,
            source.TopicId,
            source.DifficultyLevelId,
            source.Instructions,
            source.TimeLimitMinutes,
            source.AllowedAttempts,
            source.ShuffleQuestions,
            source.ShuffleOptions,
            source.IsReviewRequired,
            source.NavigationMode,
            QuizReviewDisplay.Full,
            source.RandomQuestionCount);

        await _quizzes.AddQuizAsync(copy, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        if (copy.Id <= 0)
        {
            throw new InvalidOperationException("Duplicated quiz was not assigned a database id.");
        }

        await RecordTrailEventAsync(copy.Id, scope, ApprovalAction.Created, cancellationToken);

        var sourceQuestions = await _quizQuestions.GetQuizQuestionsForCopyAsync(quizId, cancellationToken);
        if (sourceQuestions.Count == 0)
        {
            throw new BusinessRuleException("Quiz must contain at least one active question to duplicate.");
        }

        var questionStatusId = await _guard.RequireLookupAsync(
            LookupNames.QuestionStatus,
            LookupNames.ActiveQuestionStatusNames,
            cancellationToken);

        // Target visibility for this actor — only applied when higher than the existing question.
        var targetVisibility = scope.Role switch
        {
            UserRole.PortalAdmin => QuestionVisibilityLevels.Public,
            UserRole.SchoolAdmin => QuestionVisibilityLevels.School,
            UserRole.CampusAdmin => QuestionVisibilityLevels.Campus,
            _ => QuestionVisibilityLevels.Campus,
        };

        foreach (var sourceQuestion in sourceQuestions)
        {
            var question = await _questions.GetQuestionEntityForManageAsync(
                    sourceQuestion.QuestionId,
                    cancellationToken)
                ?? throw new NotFoundAppException(
                    $"Question {sourceQuestion.QuestionId} was not found and cannot be linked to the duplicated quiz.");

            // Reuse the bank question; never insert a copy. Raise visibility only (never downgrade).
            question.RaiseVisibilityIfHigher(scope.UserId, questionStatusId, targetVisibility);

            await _quizQuestions.AddQuizQuestionAsync(
                new QuizQuestion(
                    copy.Id,
                    question.Id,
                    sourceQuestion.DisplayOrder,
                    sourceQuestion.Marks,
                    sourceQuestion.EstimatedTimeSeconds),
                cancellationToken);
        }

        await _quizQuestions.RecalculateQuizTotalsAsync(copy.Id, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var duplicated = await BuildManageResponseAsync(copy.Id, cancellationToken);
        return new DuplicateQuizResponse(quizId, duplicated);
    }

    public async Task<ArchiveQuizResponse> ArchiveAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        var quiz = await _guard.RequireOwnedQuizAsync(quizId, scope, cancellationToken);

        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        var approvalName = await _lookups.GetLookupNameAsync(quiz.ApprovalStatusId, cancellationToken);
        var isParentPrivate = await _quizzes.IsParentPrivateQuizTypeAsync(quiz.QuizTypeId, cancellationToken);
        QuizDeleteArchiveRules.EnsureCanDeleteOrArchive(
            quiz,
            scope,
            lifecycleName,
            approvalName,
            isParentPrivate);

        if (IsArchivedLifecycle(lifecycleName))
        {
            throw new BusinessRuleException("Quiz is already archived.");
        }

        if (IsDraftLifecycle(lifecycleName))
        {
            throw new BusinessRuleException("Draft quizzes should be deleted instead of archived.");
        }

        // No assignment rows: remove from DB. Otherwise soft-archive (same visibility rules as published).
        if (!await _quizzes.HasAnyAssignmentsAsync(quizId, cancellationToken))
        {
            await _quizzes.DeleteQuizAsync(quiz, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return new ArchiveQuizResponse(quizId, "Deleted", PermanentlyDeleted: true);
        }

        var archivedStatusId = await _guard.RequireLookupAsync(
            LookupNames.QuizLifecycleStatus,
            LookupNames.ArchivedLifecycleNames,
            cancellationToken);

        quiz.Archive(archivedStatusId);
        await RecordTrailEventAsync(quizId, scope, ApprovalAction.Archived, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var archivedName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        return new ArchiveQuizResponse(quizId, archivedName, PermanentlyDeleted: false);
    }

    public async Task<UnarchiveQuizResponse> UnarchiveAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        var quiz = await _guard.RequireOwnedQuizAsync(quizId, scope, cancellationToken);

        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        var approvalName = await _lookups.GetLookupNameAsync(quiz.ApprovalStatusId, cancellationToken);
        var isParentPrivate = await _quizzes.IsParentPrivateQuizTypeAsync(quiz.QuizTypeId, cancellationToken);
        QuizDeleteArchiveRules.EnsureCanDeleteOrArchive(
            quiz,
            scope,
            lifecycleName,
            approvalName,
            isParentPrivate);

        if (!IsArchivedLifecycle(lifecycleName))
        {
            throw new BusinessRuleException("Only archived quizzes can be unarchived.");
        }

        var hasAssignments = await _quizzes.HasAnyAssignmentsAsync(quizId, cancellationToken);
        var restoredStatusId = await _guard.RequireLookupAsync(
            LookupNames.QuizLifecycleStatus,
            hasAssignments
                ? LookupNames.AssignedLifecycleNames
                : LookupNames.PublishedLifecycleNames,
            cancellationToken);

        quiz.Unarchive(restoredStatusId);
        await RecordTrailEventAsync(quizId, scope, ApprovalAction.Unarchived, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var restoredName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        return new UnarchiveQuizResponse(quizId, restoredName);
    }

    /// <summary>Queues one app_approval trail row; persisted by the caller's SaveChanges.</summary>
    private Task RecordTrailEventAsync(
        long quizId,
        QuizManageScope scope,
        ApprovalAction action,
        CancellationToken cancellationToken,
        string? reason = null)
        => _quizzes.AddApprovalEventAsync(
            Approval.RecordQuizEvent(
                quizId,
                scope.UserId,
                scope.Role,
                action,
                DateTimeOffset.UtcNow,
                reason),
            cancellationToken);

    private async Task<ManageQuizResponse> BuildManageResponseAsync(long quizId, CancellationToken cancellationToken)
    {
        var detail = await _quizzes.GetDetailForManageAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");

        var questions = await _quizQuestions.GetQuizQuestionsAsync(quizId, cancellationToken, includeInactive: true);
        var creatorRole = await ResolveQuizCreatorRoleAsync(detail.CreatedByName, cancellationToken);
        return await _editRequestService.AttachStateAsync(
            QuizManageMapping.ToManageResponse(detail, questions, createdByRole: creatorRole.ToString()),
            cancellationToken);
    }

    private async Task<string> GetQuizApprovalNameAsync(short approvalStatusId, CancellationToken cancellationToken)
    {
        var typed = await _lookups.GetByIdAndTypeAsync(
            approvalStatusId,
            LookupNames.QuizApprovalStatus,
            cancellationToken);
        if (typed is not null)
        {
            return typed.Name;
        }

        return await _lookups.GetLookupNameAsync(approvalStatusId, cancellationToken);
    }

    private Task<UserRole> ResolveQuizCreatorRoleAsync(Quiz quiz, CancellationToken cancellationToken)
        => ResolveQuizCreatorRoleAsync(quiz.CreatedByName, cancellationToken);

    private async Task<UserRole> ResolveQuizCreatorRoleAsync(
        string? createdByName,
        CancellationToken cancellationToken)
    {
        if (!QuizApprovalRouting.TryParseCreatorUserId(createdByName, out var creatorId))
        {
            return UserRole.Teacher;
        }

        var creator = await _users.GetByIdAsync(creatorId, cancellationToken);
        if (creator is null)
        {
            return UserRole.Teacher;
        }

        return QuizApprovalRouting.ResolveCreatorRole(creator.Roles);
    }

    private async Task<IReadOnlyList<PendingQuizApprovalItem>> FilterSchoolCampusPendingQueueAsync(
        IReadOnlyList<PendingQuizApprovalItem> items,
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        if (items.Count == 0)
        {
            return items;
        }

        var allowed = new List<PendingQuizApprovalItem>(items.Count);
        foreach (var item in items)
        {
            var creatorRole = await ResolveQuizCreatorRoleAsync(item.CreatedBy, cancellationToken);
            if (QuizApprovalRouting.MayEndorse(scope.Role, creatorRole))
            {
                allowed.Add(item);
            }
        }

        return allowed;
    }

    private async Task<StudentSchoolContext> ResolveSchoolContextAsync(
        QuizManageScope scope,
        long? contextStudentId,
        int? requestSchoolId,
        int? requestCampusId,
        CancellationToken cancellationToken)
    {
        if (scope.Role is UserRole.Parent or UserRole.Tutor)
        {
            if (scope.Role == UserRole.Tutor)
            {
                var tutorLinkedStudentIds = await _studentScope.GetTutorLinkedStudentIdsAsync(scope.ProfileId, cancellationToken);
                if (tutorLinkedStudentIds.Count == 0)
                {
                    throw new BusinessRuleException("Link at least one student before creating a quiz.");
                }

                return new StudentSchoolContext(null, null, 0);
            }

            var linkedStudentIds = await _studentScope.GetLinkedStudentIdsAsync(scope.ParentId, cancellationToken);
            if (linkedStudentIds.Count == 0)
            {
                throw new BusinessRuleException("Link at least one child before creating a quiz.");
            }

            var studentId = contextStudentId ?? linkedStudentIds[0];
            if (!linkedStudentIds.Contains(studentId))
            {
                throw new ForbiddenAppException("Selected child is not linked to this parent account.");
            }

            var context = await _studentScope.GetStudentSchoolContextAsync(studentId, cancellationToken)
                ?? throw new BusinessRuleException("Student school context was not found.");

            if (context.SchoolId is not > 0)
            {
                throw new BusinessRuleException("Student school context was not found.");
            }

            return context;
        }

        if (scope.Role is UserRole.Teacher or UserRole.Coordinator or UserRole.CampusAdmin)
        {
            var schoolId = scope.SchoolId
                ?? throw new ForbiddenAppException($"{scope.Role} school context was not found.");
            var campusId = scope.CampusId
                ?? throw new ForbiddenAppException($"{scope.Role} campus context was not found.");

            return new StudentSchoolContext(schoolId, campusId, 0);
        }

        if (scope.Role == UserRole.SchoolAdmin)
        {
            var schoolId = scope.SchoolId ?? throw new ForbiddenAppException("School admin school context was not found.");
            // Campus is optional on create.
            var campusId = requestCampusId is > 0
                ? requestCampusId
                : scope.CampusId is > 0 ? scope.CampusId : null;

            return new StudentSchoolContext(schoolId, campusId, 0);
        }

        if (scope.Role == UserRole.PortalAdmin)
        {
            // School and campus are optional on create.
            var schoolId = requestSchoolId is > 0 ? requestSchoolId : null;
            var campusId = requestCampusId is > 0 ? requestCampusId : null;

            return new StudentSchoolContext(schoolId, campusId, 0);
        }

        throw new ForbiddenAppException("School context is not available for this role yet.");
    }

    private async Task<short> ResolveQuizTypeIdForCreateAsync(
        QuizManageScope scope,
        short? requestedQuizTypeId,
        CancellationToken cancellationToken)
    {
        if (scope.Role is UserRole.Parent or UserRole.Tutor)
        {
            return await _guard.RequireLookupAsync(
                LookupNames.QuizType,
                LookupNames.ParentPrivateQuizTypeNames,
                cancellationToken);
        }

        if (requestedQuizTypeId is > 0)
        {
            if (await _quizzes.IsParentPrivateQuizTypeAsync(requestedQuizTypeId.Value, cancellationToken))
            {
                throw new ValidationAppException(["Only parents and tutors can create parent private quizzes."]);
            }

            return requestedQuizTypeId.Value;
        }

        return await _guard.RequireLookupAsync(
            LookupNames.QuizType,
            LookupNames.SchoolQuizTypeNames,
            cancellationToken);
    }

    private async Task<short> ResolveInitialApprovalStatusIdAsync(
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        return await _guard.RequireQuizApprovalStatusAsync(
            LookupNames.QuizApprovalStatusIds.Pending,
            LookupNames.PendingApprovalStatusNames,
            cancellationToken);
    }

    private static void ValidateCreateRequest(CreateQuizRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            errors.Add("Title is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Instructions))
        {
            errors.Add("Instructions are required.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
    }

    /// <summary>Maps unset/0 lookup ids to null so optional FK columns are not violated.</summary>
    private static short? OptionalLookupId(short value) => value > 0 ? value : null;

    private static bool IsDraftLifecycle(string lifecycleName)
        => LookupNames.DraftLifecycleNames.Any(
            name => lifecycleName.Equals(name, StringComparison.OrdinalIgnoreCase));

    private static bool IsArchivedLifecycle(string lifecycleName)
        => lifecycleName.Equals("Archived", StringComparison.OrdinalIgnoreCase);

    private ICurrentUserService GetCurrentUser() => _currentUser;
}
