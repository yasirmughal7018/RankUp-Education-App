using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>Persistence for additional-role requests.</summary>
public interface IUserRoleRequestRepository
{
    Task AddAsync(UserRoleRequest request, CancellationToken cancellationToken);

    Task<UserRoleRequest?> GetByIdAsync(long requestId, CancellationToken cancellationToken);

    Task<UserRoleRequest?> GetPendingForUserAsync(long userId, CancellationToken cancellationToken);

    Task CancelPendingForUserAsync(
        long userId,
        DateTimeOffset resolvedAt,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<UserRoleRequest>> ListPendingAsync(
        int take,
        int? schoolIdFilter,
        int? campusIdFilter,
        CancellationToken cancellationToken);
}
