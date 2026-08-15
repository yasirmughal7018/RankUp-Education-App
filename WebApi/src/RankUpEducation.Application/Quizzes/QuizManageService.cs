using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Lookups;
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
    /// Publishes the quiz. Teachers submit for approval; parents self-approve on publish.
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
    private readonly QuizManageGuard _guard;

    public QuizManageService(
        IQuizRepository quizzes,
        IQuizQuestionRepository quizQuestions,
        IQuestionRepository questions,
        ILookupRepository lookups,
        IStudentScopeRepository studentScope,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser)
    {
        _quizzes = quizzes;
        _quizQuestions = quizQuestions;
        _questions = questions;
        _lookups = lookups;
        _studentScope = studentScope;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _guard = new QuizManageGuard(quizzes, lookups);
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
            QuizReviewDisplay.Full);

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
        var quiz = await _guard.RequireEditableQuizAsync(quizId, scope, cancellationToken);

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
            QuizReviewDisplay.Full);

        await _quizQuestions.RecalculateQuizTotalsAsync(quizId, cancellationToken);
        await RecordTrailEventAsync(quizId, scope, ApprovalAction.Modified, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await BuildManageResponseAsync(quizId, cancellationToken);
    }

    public async Task DeleteAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        var quiz = await _guard.RequireOwnedQuizAsync(quizId, scope, cancellationToken);
        await _guard.EnsureDraftOnlyAsync(quiz, cancellationToken);

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
        var quiz = await _guard.RequireEditableQuizAsync(quizId, scope, cancellationToken);

        var publishedStatusId = await _guard.RequireLookupAsync(
            LookupNames.QuizLifecycleStatus,
            LookupNames.PublishedLifecycleNames,
            cancellationToken);

        if (scope.Role is UserRole.Teacher or UserRole.Coordinator)
        {
            // Teacher publish (re)queues Pending approval — also recovers Rejected quizzes.
            var pendingApprovalStatusId = await _guard.RequireLookupAsync(
                LookupNames.QuizApprovalStatus,
                LookupNames.PendingApprovalStatusNames,
                cancellationToken);
            quiz.SubmitForApproval(publishedStatusId, pendingApprovalStatusId);
            await RecordTrailEventAsync(quizId, scope, ApprovalAction.SubmittedForReview, cancellationToken);
        }
        else if (scope.Role is UserRole.SchoolAdmin or UserRole.CampusAdmin)
        {
            var schoolApprovedStatusId = await _guard.RequireLookupAsync(
                LookupNames.QuizApprovalStatus,
                LookupNames.SchoolApprovedStatusNames,
                cancellationToken);
            quiz.Publish(publishedStatusId, schoolApprovedStatusId, scope.UserId.ToString());
            await RecordTrailEventAsync(quizId, scope, ApprovalAction.Endorsed, cancellationToken);
        }
        else
        {
            // PortalAdmin / Parent: final Approved (parents skip the school queue).
            var approvedStatusId = await _guard.RequireLookupAsync(
                LookupNames.QuizApprovalStatus,
                LookupNames.ApprovedStatusNames,
                cancellationToken);
            quiz.Publish(publishedStatusId, approvedStatusId, scope.UserId.ToString());
            await RecordTrailEventAsync(quizId, scope, ApprovalAction.Approved, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await BuildManageResponseAsync(quizId, cancellationToken);
    }

    public async Task<ManageQuizResponse> GetManageDetailAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        await _guard.RequireOwnedQuizAsync(quizId, scope, cancellationToken);
        return await BuildManageResponseAsync(quizId, cancellationToken);
    }

    public async Task<ApproveQuizResponse> ApproveAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireApprovalScope(GetCurrentUser());
        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");

        EnsureApprovalTargetAccess(quiz, scope);

        if (await _quizzes.IsParentPrivateQuizTypeAsync(quiz.QuizTypeId, cancellationToken))
        {
            throw new BusinessRuleException("Parent private quizzes do not require school approval.");
        }

        var approvalName = await _lookups.GetLookupNameAsync(quiz.ApprovalStatusId, cancellationToken);
        if (LookupNames.IsRejectedApprovalName(approvalName))
        {
            throw new BusinessRuleException(
                "Rejected quizzes cannot be approved. The teacher must resubmit the quiz first.");
        }

        short nextStatusId;
        string nextStatusName;
        if (scope.Role is UserRole.SchoolAdmin or UserRole.CampusAdmin)
        {
            if (!LookupNames.IsPendingApprovalName(approvalName))
            {
                throw new BusinessRuleException("Only pending quizzes can be school-approved.");
            }

            nextStatusId = await _guard.RequireLookupAsync(
                LookupNames.QuizApprovalStatus,
                LookupNames.SchoolApprovedStatusNames,
                cancellationToken);
            nextStatusName = "SchoolApproved";
        }
        else
        {
            if (!LookupNames.IsPendingApprovalName(approvalName)
                && !LookupNames.IsSchoolApprovedName(approvalName))
            {
                throw new BusinessRuleException(
                    "Only pending or school-approved quizzes can be approved by portal admin.");
            }

            nextStatusId = await _guard.RequireLookupAsync(
                LookupNames.QuizApprovalStatus,
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

        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
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

        EnsureApprovalTargetAccess(quiz, scope);

        if (await _quizzes.IsParentPrivateQuizTypeAsync(quiz.QuizTypeId, cancellationToken))
        {
            throw new BusinessRuleException("Parent private quizzes do not require school approval.");
        }

        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            throw new ValidationAppException(["Rejection reason is required."]);
        }

        var approvalName = await _lookups.GetLookupNameAsync(quiz.ApprovalStatusId, cancellationToken);
        if (LookupNames.IsRejectedApprovalName(approvalName))
        {
            throw new BusinessRuleException("Quiz is already rejected.");
        }

        if (LookupNames.IsFinalApprovedName(approvalName))
        {
            throw new BusinessRuleException("Fully approved quizzes cannot be rejected.");
        }

        if (!LookupNames.IsPendingApprovalName(approvalName)
            && !LookupNames.IsSchoolApprovedName(approvalName))
        {
            throw new BusinessRuleException("Only pending or school-approved quizzes can be rejected.");
        }

        var rejectedStatusId = await _guard.RequireLookupAsync(
            LookupNames.QuizApprovalStatus,
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

        var reason = quiz.RejectionReason;
        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        return new RejectQuizResponse(quizId, "Rejected", lifecycleName, reason);
    }

    public async Task<PendingQuizApprovalListResponse> ListPendingApprovalAsync(
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireApprovalScope(GetCurrentUser());
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

    private static void EnsureApprovalTargetAccess(Quiz quiz, QuizManageScope scope)
    {
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
        var pendingApprovalId = await _guard.RequireLookupAsync(
            LookupNames.QuizApprovalStatus,
            ["Pending", "Draft"],
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
            QuizReviewDisplay.Full);

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
        return QuizManageMapping.ToManageResponse(detail, questions);
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

        if (scope.Role is UserRole.Teacher or UserRole.Coordinator)
        {
            var schoolId = scope.SchoolId ?? throw new ForbiddenAppException("Teacher school context was not found.");
            var campusId = scope.CampusId ?? throw new ForbiddenAppException("Teacher campus context was not found.");

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
        if (scope.Role == UserRole.Parent)
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
                throw new ValidationAppException(["Only parents can create parent private quizzes."]);
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
        return await _guard.RequireLookupAsync(
            LookupNames.QuizApprovalStatus,
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
