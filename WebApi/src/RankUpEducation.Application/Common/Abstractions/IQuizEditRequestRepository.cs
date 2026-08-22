using RankUpEducation.Domain.Approvals;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>
/// Persistence for quiz edit requests. Approver queue rows live in app_approval
/// (<see cref="ApprovalEntityType.QuizEditRequest"/>).
/// </summary>
public interface IQuizEditRequestRepository
{
    Task AddAsync(QuizEditRequest request, CancellationToken cancellationToken);

    Task AddApprovalsAsync(
        IEnumerable<Approval> approvals,
        CancellationToken cancellationToken);

    Task<QuizEditRequest?> GetByIdAsync(long requestId, CancellationToken cancellationToken);

    Task<QuizEditRequest?> GetPendingForUserAsync(
        long quizId,
        long requestedByUserId,
        CancellationToken cancellationToken);

    Task<QuizEditRequest?> GetUnusedGrantAsync(
        long quizId,
        long requestedByUserId,
        CancellationToken cancellationToken);

    Task<QuizEditRequest?> GetLatestForUserAsync(
        long quizId,
        long requestedByUserId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizEditRequest>> ListPendingForQuizAsync(
        long quizId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizEditRequestQueueRow>> ListPendingQueueAsync(
        long approverUserId,
        UserRole approverRole,
        CancellationToken cancellationToken);

    Task<Approval?> GetPendingApprovalAsync(
        long requestId,
        long approverUserId,
        UserRole approverRole,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<Approval>> ListPendingApprovalsAsync(
        long requestId,
        CancellationToken cancellationToken);

    Task CancelPendingForQuizAsync(
        long quizId,
        DateTimeOffset resolvedAt,
        long? exceptRequestId,
        string? decisionReason,
        CancellationToken cancellationToken);
}

/// <summary>Pending quiz edit-request queue row with title and requester name.</summary>
public sealed record QuizEditRequestQueueRow(
    long RequestId,
    long QuizId,
    string QuizTitle,
    long RequestedByUserId,
    string RequesterName,
    UserRole RequestedByRole,
    string Reason,
    DateTimeOffset RequestedAt);
