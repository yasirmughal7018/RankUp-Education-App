using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Notifications;
using RankUpEducation.Contracts.Questions;
using RankUpEducation.Domain.Approvals;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Application.Questions;

/// <summary>
/// Active-question edit requests: non–PortalAdmin asks with a reason; PortalAdmin grants a
/// one-time edit. The grant is consumed on PUT and the question returns to PendingReview.
/// </summary>
public interface IQuestionEditRequestService
{
    Task<QuestionEditRequestSummary> RequestEditAsync(
        long questionId,
        CreateQuestionEditRequestRequest request,
        CancellationToken cancellationToken);

    Task<QuestionEditRequestListResponse> ListPendingAsync(CancellationToken cancellationToken);

    Task<QuestionEditRequestSummary> ApproveAsync(
        long requestId,
        CancellationToken cancellationToken);

    Task<QuestionEditRequestSummary> RejectAsync(
        long requestId,
        RejectQuestionEditRequestRequest request,
        CancellationToken cancellationToken);
}

/// <inheritdoc cref="IQuestionEditRequestService"/>
public sealed class QuestionEditRequestService : IQuestionEditRequestService
{
    public const string NotificationCategory = "QuestionEditRequest";

    private readonly IQuestionEditRequestRepository _editRequests;
    private readonly IQuestionRepository _questions;
    private readonly IUserRepository _users;
    private readonly INotificationService _notifications;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;

    public QuestionEditRequestService(
        IQuestionEditRequestRepository editRequests,
        IQuestionRepository questions,
        IUserRepository users,
        INotificationService notifications,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser)
    {
        _editRequests = editRequests;
        _questions = questions;
        _users = users;
        _notifications = notifications;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
    }

    /// <inheritdoc />
    public async Task<QuestionEditRequestSummary> RequestEditAsync(
        long questionId,
        CreateQuestionEditRequestRequest request,
        CancellationToken cancellationToken)
    {
        var scope = QuestionScopeResolver.RequireManageScope(_currentUser);
        if (scope.IsPortalAdmin)
        {
            throw new BusinessRuleException(
                "Portal Admin can edit active questions directly; an edit request is not needed.");
        }

        var reason = request.Reason?.Trim() ?? string.Empty;
        if (reason.Length < QuestionService.MinRejectionReasonLength)
        {
            throw new ValidationAppException(
            [
                $"A reason is required (at least {QuestionService.MinRejectionReasonLength} characters)."
            ]);
        }

        var question = await _questions.GetQuestionEntityForManageAsync(questionId, cancellationToken)
            ?? throw new NotFoundAppException("Question was not found.");

        if (!QuestionScopeResolver.CanViewQuestion(
                question.CreatedBy,
                question.CreatedByRole,
                question.VisibilityLevel,
                question.SchoolId,
                question.CampusId,
                scope))
        {
            throw new ForbiddenAppException("You do not have access to this question.");
        }

        if (!question.IsActive)
        {
            throw new BusinessRuleException(
                "Edit requests apply only to Active questions. You can edit your own PendingReview or Rejected questions directly.");
        }

        if (await _editRequests.GetPendingForUserAsync(questionId, scope.UserId, cancellationToken) is not null)
        {
            throw new BusinessRuleException("You already have a pending edit request for this question.");
        }

        if (await _editRequests.GetUnusedGrantAsync(questionId, scope.UserId, cancellationToken) is not null)
        {
            throw new BusinessRuleException(
                "You already have permission to edit this question. Open Edit to make your change.");
        }

        var now = DateTimeOffset.UtcNow;
        var editRequest = QuestionEditRequest.Create(
            questionId,
            scope.UserId,
            scope.Role,
            reason,
            now);

        await _editRequests.AddAsync(editRequest, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var candidates = await _users.ListPendingApproverCandidatesAsync(
            schoolId: null,
            campusId: null,
            cancellationToken);
        var portalAdmins = candidates
            .Where(candidate => candidate.Role == UserRole.PortalAdmin)
            .ToArray();

        if (portalAdmins.Length > 0)
        {
            var approvals = portalAdmins
                .Select(candidate => Approval.CreatePendingQuestionEdit(
                    editRequest.Id,
                    candidate.UserId,
                    candidate.Role))
                .ToArray();
            await _editRequests.AddApprovalsAsync(approvals, cancellationToken);

            var requesterName = await ResolveUserNameAsync(scope.UserId, cancellationToken);
            var preview = Truncate(question.QuestionText, 80);
            await _notifications.CreateAsync(
                portalAdmins.Select(candidate => candidate.UserId).Distinct().ToArray(),
                "Question edit request",
                $"{requesterName} asked to edit question #{questionId}: {preview}",
                NotificationCategory,
                cancellationToken);
        }
        else
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        var name = await ResolveUserNameAsync(scope.UserId, cancellationToken);
        return ToSummary(editRequest, name);
    }

    /// <inheritdoc />
    public async Task<QuestionEditRequestListResponse> ListPendingAsync(
        CancellationToken cancellationToken)
    {
        EnsurePortalAdmin();
        var rows = await _editRequests.ListPendingQueueAsync(cancellationToken);
        var items = rows
            .Select(row => new QuestionEditRequestListItem(
                row.RequestId,
                row.QuestionId,
                row.QuestionText,
                row.RequesterName,
                row.RequestedByRole.ToString(),
                row.Reason,
                row.RequestedAt))
            .ToArray();
        return new QuestionEditRequestListResponse(items);
    }

    /// <inheritdoc />
    public async Task<QuestionEditRequestSummary> ApproveAsync(
        long requestId,
        CancellationToken cancellationToken)
    {
        EnsurePortalAdmin();
        var editRequest = await RequirePendingRequestAsync(requestId, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        editRequest.Approve(now);
        await DecideApprovalsAsync(editRequest.Id, approved: true, now, reason: null, cancellationToken);

        var requesterName = await ResolveUserNameAsync(editRequest.RequestedByUserId, cancellationToken);
        await _notifications.CreateAsync(
            [editRequest.RequestedByUserId],
            "Question edit request approved",
            $"You may edit question #{editRequest.QuestionId} once. Saving sends it back to PendingReview.",
            NotificationCategory,
            cancellationToken);

        return ToSummary(editRequest, requesterName);
    }

    /// <inheritdoc />
    public async Task<QuestionEditRequestSummary> RejectAsync(
        long requestId,
        RejectQuestionEditRequestRequest request,
        CancellationToken cancellationToken)
    {
        EnsurePortalAdmin();
        var reason = request.Reason?.Trim() ?? string.Empty;
        if (reason.Length < QuestionService.MinRejectionReasonLength)
        {
            throw new ValidationAppException(
            [
                $"A reason is required (at least {QuestionService.MinRejectionReasonLength} characters)."
            ]);
        }

        var editRequest = await RequirePendingRequestAsync(requestId, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        editRequest.Reject(now, reason);
        await DecideApprovalsAsync(editRequest.Id, approved: false, now, reason, cancellationToken);

        var requesterName = await ResolveUserNameAsync(editRequest.RequestedByUserId, cancellationToken);
        await _notifications.CreateAsync(
            [editRequest.RequestedByUserId],
            "Question edit request rejected",
            $"Your request to edit question #{editRequest.QuestionId} was rejected: {reason}",
            NotificationCategory,
            cancellationToken);

        return ToSummary(editRequest, requesterName);
    }

    private async Task<QuestionEditRequest> RequirePendingRequestAsync(
        long requestId,
        CancellationToken cancellationToken)
    {
        var editRequest = await _editRequests.GetByIdAsync(requestId, cancellationToken)
            ?? throw new NotFoundAppException("Edit request was not found.");
        if (!editRequest.IsPending)
        {
            throw new BusinessRuleException("This edit request is no longer pending.");
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
        var scope = QuestionScopeResolver.RequireManageScope(_currentUser);
        var pendingForDecider = await _editRequests.GetPendingApprovalAsync(
            requestId,
            scope.UserId,
            scope.Role,
            cancellationToken);

        if (pendingForDecider is null)
        {
            var created = Approval.CreatePendingQuestionEdit(requestId, scope.UserId, scope.Role);
            if (approved)
            {
                created.MarkApproved(decidedAt);
            }
            else
            {
                created.MarkRejected(decidedAt, reason);
            }

            await _editRequests.AddApprovalsAsync([created], cancellationToken);
        }

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
                approval.MarkRejected(decidedAt, "Resolved by another Portal Admin.");
            }
            else
            {
                approval.MarkRejected(decidedAt, reason);
            }
        }
    }

    private void EnsurePortalAdmin()
    {
        var scope = QuestionScopeResolver.RequireManageScope(_currentUser);
        if (!scope.IsPortalAdmin)
        {
            throw new ForbiddenAppException("Only Portal Admin can review question edit requests.");
        }
    }

    private async Task<string> ResolveUserNameAsync(long userId, CancellationToken cancellationToken)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken);
        return string.IsNullOrWhiteSpace(user?.FullName) ? $"User #{userId}" : user.FullName;
    }

    private static QuestionEditRequestSummary ToSummary(QuestionEditRequest request, string requesterName)
        => new(
            request.Id,
            request.QuestionId,
            requesterName,
            request.RequestedByRole.ToString(),
            request.Reason,
            request.Status.ToString(),
            request.RequestedAt,
            request.ResolvedAt,
            request.HasUnusedEditGrant,
            request.DecisionReason);

    private static string Truncate(string value, int maxLength)
    {
        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength] + "…";
    }
}
