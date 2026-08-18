using RankUpEducation.Domain.Approvals;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>
/// Persistence for Active-question edit requests. Approver queue rows live in app_approval
/// (<see cref="ApprovalEntityType.QuestionEditRequest"/>).
/// </summary>
public interface IQuestionEditRequestRepository
{
    Task AddAsync(QuestionEditRequest request, CancellationToken cancellationToken);

    Task AddApprovalsAsync(
        IEnumerable<Approval> approvals,
        CancellationToken cancellationToken);

    Task<QuestionEditRequest?> GetByIdAsync(long requestId, CancellationToken cancellationToken);

    Task<QuestionEditRequest?> GetPendingForUserAsync(
        long questionId,
        long requestedByUserId,
        CancellationToken cancellationToken);

    Task<QuestionEditRequest?> GetUnusedGrantAsync(
        long questionId,
        long requestedByUserId,
        CancellationToken cancellationToken);

    Task<QuestionEditRequest?> GetLatestForUserAsync(
        long questionId,
        long requestedByUserId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<QuestionEditRequest>> ListPendingForQuestionAsync(
        long questionId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<QuestionEditRequestQueueRow>> ListPendingQueueAsync(
        CancellationToken cancellationToken);

    Task<Approval?> GetPendingApprovalAsync(
        long requestId,
        long approverUserId,
        UserRole approverRole,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<Approval>> ListPendingApprovalsAsync(
        long requestId,
        CancellationToken cancellationToken);

    /// <summary>
    /// Closes other pending requests on this question (and their app_approval queue rows)
    /// after a grant is used or the question leaves Active.
    /// </summary>
    Task CancelPendingForQuestionAsync(
        long questionId,
        DateTimeOffset resolvedAt,
        long? exceptRequestId,
        string? decisionReason,
        CancellationToken cancellationToken);

    /// <summary>
    /// Deletes edit-request rows and their app_approval queue rows for a question being removed.
    /// </summary>
    Task RemoveForQuestionAsync(long questionId, CancellationToken cancellationToken);
}

/// <summary>Pending edit-request queue row with question text and requester name.</summary>
public sealed record QuestionEditRequestQueueRow(
    long RequestId,
    long QuestionId,
    string QuestionText,
    long RequestedByUserId,
    string RequesterName,
    UserRole RequestedByRole,
    string Reason,
    DateTimeOffset RequestedAt);
