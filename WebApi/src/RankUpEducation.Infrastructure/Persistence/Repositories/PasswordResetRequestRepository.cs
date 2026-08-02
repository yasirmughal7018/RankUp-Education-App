using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

/// <summary>EF Core implementation of <see cref="IPasswordResetRequestRepository"/>.</summary>
public sealed class PasswordResetRequestRepository : IPasswordResetRequestRepository
{
    private readonly RankUpDbContext _dbContext;

    public PasswordResetRequestRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(UserPasswordResetRequest request, CancellationToken cancellationToken)
    {
        await _dbContext.UserPasswordResetRequests.AddAsync(request, cancellationToken);
    }

    public Task<UserPasswordResetRequest?> GetByIdAsync(
        long requestId,
        CancellationToken cancellationToken)
    {
        return _dbContext.UserPasswordResetRequests
            .FirstOrDefaultAsync(request => request.Id == requestId, cancellationToken);
    }

    public Task<UserPasswordResetRequest?> GetPendingForUserAsync(
        long userId,
        CancellationToken cancellationToken)
    {
        return _dbContext.UserPasswordResetRequests
            .Where(request =>
                request.UserId == userId
                && request.Status == PasswordResetRequestStatus.Pending)
            .OrderByDescending(request => request.RequestedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<UserPasswordResetRequest?> GetPendingByEmailTokenHashAsync(
        string tokenHash,
        CancellationToken cancellationToken)
    {
        var normalized = tokenHash.Trim().ToLowerInvariant();
        return _dbContext.UserPasswordResetRequests
            .Where(request =>
                request.Status == PasswordResetRequestStatus.Pending
                && request.EmailTokenHash != null
                && request.EmailTokenHash.ToLower() == normalized)
            .OrderByDescending(request => request.RequestedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task CancelPendingForUserAsync(
        long userId,
        DateTimeOffset resolvedAt,
        CancellationToken cancellationToken)
    {
        var pending = await _dbContext.UserPasswordResetRequests
            .Where(request =>
                request.UserId == userId
                && request.Status == PasswordResetRequestStatus.Pending)
            .ToListAsync(cancellationToken);

        foreach (var request in pending)
        {
            request.Cancel(resolvedAt);
        }
    }
}
