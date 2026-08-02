using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>Persistence for forgot-password requests (email token + admin clear, one completion).</summary>
public interface IPasswordResetRequestRepository
{
    Task AddAsync(UserPasswordResetRequest request, CancellationToken cancellationToken);

    Task<UserPasswordResetRequest?> GetByIdAsync(long requestId, CancellationToken cancellationToken);

    Task<UserPasswordResetRequest?> GetPendingForUserAsync(
        long userId,
        CancellationToken cancellationToken);

    Task<UserPasswordResetRequest?> GetPendingByEmailTokenHashAsync(
        string tokenHash,
        CancellationToken cancellationToken);

    Task CancelPendingForUserAsync(
        long userId,
        DateTimeOffset resolvedAt,
        CancellationToken cancellationToken);
}
