using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>Persistence for school/campus change requests and their approval queue.</summary>
public interface ISchoolChangeRequestRepository
{
    Task AddAsync(UserSchoolChangeRequest request, CancellationToken cancellationToken);

    Task AddApprovalsAsync(
        IEnumerable<UserSchoolChangeApproval> approvals,
        CancellationToken cancellationToken);

    Task<UserSchoolChangeRequest?> GetByIdAsync(long requestId, CancellationToken cancellationToken);

    /// <summary>Returns the user's open school-change request, if any.</summary>
    Task<UserSchoolChangeRequest?> GetPendingForUserAsync(
        long userId,
        CancellationToken cancellationToken);

    /// <summary>Closes prior pending requests when the user submits a new transfer.</summary>
    Task CancelPendingForUserAsync(
        long userId,
        DateTimeOffset resolvedAt,
        CancellationToken cancellationToken);

    /// <summary>Pending transfers scoped by destination school/campus for admin review.</summary>
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

    /// <summary>True when any admin with the given role has approved the request.</summary>
    Task<bool> HasRoleApprovedAsync(
        long requestId,
        UserRole approverRole,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<PendingApproverCandidate>> ListPendingApproversForRequestAsync(
        long requestId,
        CancellationToken cancellationToken);
}
