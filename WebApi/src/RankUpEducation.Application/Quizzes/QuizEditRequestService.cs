using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Lookups;
using RankUpEducation.Application.Notifications;
using RankUpEducation.Contracts.Quizzes;
using RankUpEducation.Domain.Approvals;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

/// <summary>
/// Approved/published quiz edit requests: owner asks with a reason; queued approvers grant a
/// one-time edit. The grant is consumed on the next save and the quiz returns to Draft + Pending.
/// </summary>
public interface IQuizEditRequestService
{
    Task<QuizEditRequestSummary> RequestEditAsync(
        long quizId,
        CreateQuizEditRequestRequest request,
        CancellationToken cancellationToken);

    Task<QuizEditRequestListResponse> ListPendingAsync(CancellationToken cancellationToken);

    Task<QuizEditRequestSummary> ApproveAsync(
        long requestId,
        CancellationToken cancellationToken);

    Task<QuizEditRequestSummary> RejectAsync(
        long requestId,
        RejectQuizEditRequestRequest request,
        CancellationToken cancellationToken);

    Task<ManageQuizResponse> AttachStateAsync(
        ManageQuizResponse response,
        CancellationToken cancellationToken);
}

/// <inheritdoc cref="IQuizEditRequestService"/>
public sealed class QuizEditRequestService : IQuizEditRequestService
{
    public const string NotificationCategory = "QuizEditRequest";

    private readonly IQuizEditRequestRepository _editRequests;
    private readonly IQuizRepository _quizzes;
    private readonly ILookupRepository _lookups;
    private readonly IUserRepository _users;
    private readonly INotificationService _notifications;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;

    public QuizEditRequestService(
        IQuizEditRequestRepository editRequests,
        IQuizRepository quizzes,
        ILookupRepository lookups,
        IUserRepository users,
        INotificationService notifications,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser)
    {
        _editRequests = editRequests;
        _quizzes = quizzes;
        _lookups = lookups;
        _users = users;
        _notifications = notifications;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
    }

    /// <inheritdoc />
    public async Task<QuizEditRequestSummary> RequestEditAsync(
        long quizId,
        CreateQuizEditRequestRequest request,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        if (scope.Role == UserRole.PortalAdmin)
        {
            throw new BusinessRuleException(
                "Portal Admin can edit approved or published quizzes directly; an edit request is not needed.");
        }

        var reason = request.Reason?.Trim() ?? string.Empty;
        if (reason.Length < QuizEditRequestRules.MinReasonLength)
        {
            throw new ValidationAppException(
            [
                $"A reason is required (at least {QuizEditRequestRules.MinReasonLength} characters)."
            ]);
        }

        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");

        QuizScopeResolver.EnsureOwnsQuiz(quiz, scope);

        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        var approvalName = await _lookups.GetLookupNameAsync(quiz.ApprovalStatusId, cancellationToken);
        if (!QuizEditRequestRules.IsLockedForOwnerEdit(lifecycleName, approvalName))
        {
            throw new BusinessRuleException(
                "You can edit this quiz directly until it is school-approved, portal-approved, or published.");
        }

        if (await _quizzes.HasStartedAssignmentsAsync(quiz.Id, DateTimeOffset.UtcNow, cancellationToken))
        {
            throw new BusinessRuleException("Quiz cannot be edited after an assignment has started.");
        }

        if (await _editRequests.GetPendingForUserAsync(quizId, scope.UserId, cancellationToken) is not null)
        {
            throw new BusinessRuleException("You already have a pending edit request for this quiz.");
        }

        if (await _editRequests.GetUnusedGrantAsync(quizId, scope.UserId, cancellationToken) is not null)
        {
            throw new BusinessRuleException(
                "You already have permission to edit this quiz. Open Edit to make your change.");
        }

        var now = DateTimeOffset.UtcNow;
        var editRequest = QuizEditRequest.Create(
            quizId,
            scope.UserId,
            scope.Role,
            reason,
            now);

        await _editRequests.AddAsync(editRequest, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var candidates = await ResolveApproverCandidatesAsync(scope.Role, quiz, cancellationToken);
        if (candidates.Count > 0)
        {
            var approvals = candidates
                .Select(candidate => Approval.CreatePendingQuizEdit(
                    editRequest.Id,
                    candidate.UserId,
                    candidate.Role))
                .ToArray();
            await _editRequests.AddApprovalsAsync(approvals, cancellationToken);

            var requesterName = await ResolveUserNameAsync(scope.UserId, cancellationToken);
            await _notifications.CreateAsync(
                candidates.Select(candidate => candidate.UserId).Distinct().ToArray(),
                "Quiz edit request",
                $"{requesterName} asked to edit \"{quiz.QuizTitle}\" (quiz #{quizId}).",
                NotificationCategory,
                cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        var name = await ResolveUserNameAsync(scope.UserId, cancellationToken);
        return ToSummary(editRequest, name);
    }

    /// <inheritdoc />
    public async Task<QuizEditRequestListResponse> ListPendingAsync(CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        if (!QuizEditRequestRules.CanReviewEditRequests(scope.Role))
        {
            throw new ForbiddenAppException("Your role cannot review quiz edit requests.");
        }

        var rows = await _editRequests.ListPendingQueueAsync(scope.UserId, scope.Role, cancellationToken);
        var items = rows
            .Select(row => new QuizEditRequestListItem(
                row.RequestId,
                row.QuizId,
                row.QuizTitle,
                row.RequesterName,
                row.RequestedByRole.ToString(),
                row.Reason,
                row.RequestedAt))
            .ToArray();
        return new QuizEditRequestListResponse(items);
    }

    /// <inheritdoc />
    public async Task<QuizEditRequestSummary> ApproveAsync(
        long requestId,
        CancellationToken cancellationToken)
    {
        var editRequest = await RequirePendingRequestForReviewerAsync(requestId, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        editRequest.Approve(now);
        await DecideApprovalsAsync(editRequest.Id, approved: true, now, reason: null, cancellationToken);

        var requesterName = await ResolveUserNameAsync(editRequest.RequestedByUserId, cancellationToken);
        await _notifications.CreateAsync(
            [editRequest.RequestedByUserId],
            "Quiz edit request approved",
            $"You may edit quiz #{editRequest.QuizId} once. Saving sends it back to Draft + Pending; resubmit for approval after you edit.",
            NotificationCategory,
            cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ToSummary(editRequest, requesterName);
    }

    /// <inheritdoc />
    public async Task<QuizEditRequestSummary> RejectAsync(
        long requestId,
        RejectQuizEditRequestRequest request,
        CancellationToken cancellationToken)
    {
        var reason = request.Reason?.Trim() ?? string.Empty;
        if (reason.Length < QuizEditRequestRules.MinReasonLength)
        {
            throw new ValidationAppException(
            [
                $"A reason is required (at least {QuizEditRequestRules.MinReasonLength} characters)."
            ]);
        }

        var editRequest = await RequirePendingRequestForReviewerAsync(requestId, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        editRequest.Reject(now, reason);
        await DecideApprovalsAsync(editRequest.Id, approved: false, now, reason, cancellationToken);

        var requesterName = await ResolveUserNameAsync(editRequest.RequestedByUserId, cancellationToken);
        await _notifications.CreateAsync(
            [editRequest.RequestedByUserId],
            "Quiz edit request rejected",
            $"Your request to edit quiz #{editRequest.QuizId} was rejected: {reason}",
            NotificationCategory,
            cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return ToSummary(editRequest, requesterName);
    }

    /// <inheritdoc />
    public async Task<ManageQuizResponse> AttachStateAsync(
        ManageQuizResponse response,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        var mine = await _editRequests.GetLatestForUserAsync(response.Id, scope.UserId, cancellationToken);
        var grant = await _editRequests.GetUnusedGrantAsync(response.Id, scope.UserId, cancellationToken);
        IReadOnlyList<QuizEditRequestSummary>? pending = null;
        if (QuizEditRequestRules.CanReviewEditRequests(scope.Role))
        {
            var pendingEntities = await _editRequests.ListPendingForQuizAsync(response.Id, cancellationToken);
            var visible = new List<QuizEditRequestSummary>();
            foreach (var request in pendingEntities)
            {
                var queued = await _editRequests.GetPendingApprovalAsync(
                    request.Id,
                    scope.UserId,
                    scope.Role,
                    cancellationToken);
                if (queued is null)
                {
                    continue;
                }

                visible.Add(ToSummary(
                    request,
                    await ResolveUserNameAsync(request.RequestedByUserId, cancellationToken)));
            }

            pending = visible;
        }

        var mySummary = mine is null
            ? null
            : ToSummary(mine, await ResolveUserNameAsync(mine.RequestedByUserId, cancellationToken));

        return response with
        {
            MyEditRequest = mySummary,
            HasApprovedEditGrant = grant is not null,
            PendingEditRequests = pending,
        };
    }

    private async Task<QuizEditRequest> RequirePendingRequestForReviewerAsync(
        long requestId,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        if (!QuizEditRequestRules.CanReviewEditRequests(scope.Role))
        {
            throw new ForbiddenAppException("Your role cannot review quiz edit requests.");
        }

        var editRequest = await _editRequests.GetByIdAsync(requestId, cancellationToken)
            ?? throw new NotFoundAppException("Edit request was not found.");
        if (!editRequest.IsPending)
        {
            throw new BusinessRuleException("This edit request is no longer pending.");
        }

        var pendingForDecider = await _editRequests.GetPendingApprovalAsync(
            requestId,
            scope.UserId,
            scope.Role,
            cancellationToken);
        if (pendingForDecider is null)
        {
            throw new ForbiddenAppException("You are not assigned to review this quiz edit request.");
        }

        return editRequest;
    }

    private async Task DecideApprovalsAsync(
        long requestId,
        bool approved,
        DateTimeOffset decidedAt,
        string? reason,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        var pending = await _editRequests.ListPendingApprovalsAsync(requestId, cancellationToken);
        foreach (var approval in pending)
        {
            if (approval.ApprovedByUserId == scope.UserId && approval.ApprovedByRole == scope.Role)
            {
                if (approved)
                {
                    approval.MarkApproved(decidedAt);
                }
                else
                {
                    approval.MarkRejected(decidedAt, reason);
                }
            }
            else if (approved)
            {
                approval.MarkRejected(decidedAt, "Resolved by another approver.");
            }
            else
            {
                approval.MarkRejected(decidedAt, reason);
            }
        }
    }

    private async Task<IReadOnlyList<PendingApproverCandidate>> ResolveApproverCandidatesAsync(
        UserRole requesterRole,
        Quiz quiz,
        CancellationToken cancellationToken)
    {
        if (QuizEditRequestRules.RoutesToSchoolAndCampusApprovers(requesterRole))
        {
            return await _users.ListPendingApproverCandidatesAsync(
                quiz.SchoolId,
                quiz.SchoolCampusId,
                cancellationToken);
        }

        return await _users.ListPendingApproverCandidatesAsync(
            schoolId: null,
            campusId: null,
            cancellationToken);
    }

    private async Task<string> ResolveUserNameAsync(long userId, CancellationToken cancellationToken)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken);
        return string.IsNullOrWhiteSpace(user?.FullName) ? $"User #{userId}" : user.FullName;
    }

    internal static QuizEditRequestSummary ToSummary(QuizEditRequest request, string requesterName)
        => new(
            request.Id,
            request.QuizId,
            requesterName,
            request.RequestedByRole.ToString(),
            request.Reason,
            request.Status.ToString(),
            request.RequestedAt,
            request.ResolvedAt,
            request.HasUnusedEditGrant,
            request.DecisionReason);
}
