using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

/// <summary>EF Core implementation of <see cref="IUserRoleRequestRepository"/>.</summary>
public sealed class UserRoleRequestRepository : IUserRoleRequestRepository
{
    private readonly RankUpDbContext _dbContext;

    public UserRoleRequestRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(UserRoleRequest request, CancellationToken cancellationToken)
    {
        await _dbContext.UserRoleRequests.AddAsync(request, cancellationToken);
    }

    public Task<UserRoleRequest?> GetByIdAsync(long requestId, CancellationToken cancellationToken)
    {
        return _dbContext.UserRoleRequests
            .FirstOrDefaultAsync(request => request.Id == requestId, cancellationToken);
    }

    public Task<UserRoleRequest?> GetPendingForUserAsync(
        long userId,
        CancellationToken cancellationToken)
    {
        return _dbContext.UserRoleRequests
            .Where(request => request.UserId == userId && request.Status == RoleRequestStatus.Pending)
            .OrderByDescending(request => request.RequestedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task CancelPendingForUserAsync(
        long userId,
        DateTimeOffset resolvedAt,
        CancellationToken cancellationToken)
    {
        var pending = await _dbContext.UserRoleRequests
            .Where(request => request.UserId == userId && request.Status == RoleRequestStatus.Pending)
            .ToListAsync(cancellationToken);

        foreach (var request in pending)
        {
            request.Cancel(resolvedAt);
        }
    }

    public async Task<IReadOnlyList<UserRoleRequest>> ListPendingAsync(
        int take,
        int? schoolIdFilter,
        int? campusIdFilter,
        CancellationToken cancellationToken)
    {
        var safeTake = Math.Clamp(take, 1, 200);
        var query = _dbContext.UserRoleRequests
            .AsNoTracking()
            .Where(request => request.Status == RoleRequestStatus.Pending);

        if (campusIdFilter is not null)
        {
            query = query.Where(request =>
                request.CampusId == null || request.CampusId == campusIdFilter);
        }
        else if (schoolIdFilter is not null)
        {
            query = query.Where(request =>
                request.SchoolId == null || request.SchoolId == schoolIdFilter);
        }

        return await query
            .OrderByDescending(request => request.RequestedAt)
            .Take(safeTake)
            .ToListAsync(cancellationToken);
    }
}
