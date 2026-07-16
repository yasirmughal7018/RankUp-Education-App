using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Common.Abstractions;

public interface ISchoolChangeRequestRepository
{
    Task AddAsync(UserSchoolChangeRequest request, CancellationToken cancellationToken);

    Task AddApprovalsAsync(
        IEnumerable<UserSchoolChangeApproval> approvals,
        CancellationToken cancellationToken);

    Task<UserSchoolChangeRequest?> GetByIdAsync(long requestId, CancellationToken cancellationToken);

    Task<UserSchoolChangeRequest?> GetPendingForUserAsync(
        long userId,
        CancellationToken cancellationToken);

    Task CancelPendingForUserAsync(
        long userId,
        DateTimeOffset resolvedAt,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<UserSchoolChangeRequest>> ListPendingAsync(
        int take,
        int? schoolIdFilter,
        int? campusIdFilter,
        CancellationToken cancellationToken);

    Task<UserSchoolChangeApproval?> GetPendingApprovalAsync(
        long requestId,
        long approverUserId,
        UserRole approverRole,
        CancellationToken cancellationToken);

    Task<bool> HasApprovedAsync(
        long requestId,
        long approverUserId,
        UserRole approverRole,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<PendingApproverCandidate>> ListPendingApproversForRequestAsync(
        long requestId,
        CancellationToken cancellationToken);
}
