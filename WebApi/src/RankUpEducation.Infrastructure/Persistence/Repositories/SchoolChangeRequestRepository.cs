using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

public sealed class SchoolChangeRequestRepository : ISchoolChangeRequestRepository
{
    private readonly RankUpDbContext _dbContext;

    public SchoolChangeRequestRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(UserSchoolChangeRequest request, CancellationToken cancellationToken)
    {
        await _dbContext.UserSchoolChangeRequests.AddAsync(request, cancellationToken);
    }

    public async Task AddApprovalsAsync(
        IEnumerable<UserSchoolChangeApproval> approvals,
        CancellationToken cancellationToken)
    {
        await _dbContext.UserSchoolChangeApprovals.AddRangeAsync(approvals, cancellationToken);
    }

    public Task<UserSchoolChangeRequest?> GetByIdAsync(
        long requestId,
        CancellationToken cancellationToken)
    {
        return _dbContext.UserSchoolChangeRequests
            .FirstOrDefaultAsync(request => request.Id == requestId, cancellationToken);
    }

    public Task<UserSchoolChangeRequest?> GetPendingForUserAsync(
        long userId,
        CancellationToken cancellationToken)
    {
        return _dbContext.UserSchoolChangeRequests
            .Where(request =>
                request.UserId == userId
                && request.Status == SchoolChangeRequestStatus.Pending)
            .OrderByDescending(request => request.RequestedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task CancelPendingForUserAsync(
        long userId,
        DateTimeOffset resolvedAt,
        CancellationToken cancellationToken)
    {
        var pending = await _dbContext.UserSchoolChangeRequests
            .Where(request =>
                request.UserId == userId
                && request.Status == SchoolChangeRequestStatus.Pending)
            .ToListAsync(cancellationToken);

        foreach (var request in pending)
        {
            request.Cancel(resolvedAt);
        }
    }

    public async Task<IReadOnlyList<UserSchoolChangeRequest>> ListPendingAsync(
        int take,
        int? schoolIdFilter,
        int? campusIdFilter,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.UserSchoolChangeRequests.AsNoTracking()
            .Where(request => request.Status == SchoolChangeRequestStatus.Pending);

        if (campusIdFilter.HasValue)
        {
            query = query.Where(request =>
                request.ToSchoolId == schoolIdFilter
                && request.ToCampusId == campusIdFilter
                && request.RequesterRole != UserRole.CampusAdmin);
        }
        else if (schoolIdFilter.HasValue)
        {
            query = query.Where(request => request.ToSchoolId == schoolIdFilter);
        }

        return await query
            .OrderByDescending(request => request.RequestedAt)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public Task<UserSchoolChangeApproval?> GetPendingApprovalAsync(
        long requestId,
        long approverUserId,
        UserRole approverRole,
        CancellationToken cancellationToken)
    {
        return _dbContext.UserSchoolChangeApprovals.FirstOrDefaultAsync(
            approval =>
                approval.RequestId == requestId
                && approval.ApprovedByUserId == approverUserId
                && approval.ApprovedByRole == approverRole
                && approval.IsApproved == null
                && approval.ApprovedAt == null,
            cancellationToken);
    }

    public Task<bool> HasApprovedAsync(
        long requestId,
        long approverUserId,
        UserRole approverRole,
        CancellationToken cancellationToken)
    {
        return _dbContext.UserSchoolChangeApprovals.AnyAsync(
            approval =>
                approval.RequestId == requestId
                && approval.ApprovedByUserId == approverUserId
                && approval.ApprovedByRole == approverRole
                && approval.IsApproved == true,
            cancellationToken);
    }

    public Task<bool> HasRoleApprovedAsync(
        long requestId,
        UserRole approverRole,
        CancellationToken cancellationToken)
    {
        return _dbContext.UserSchoolChangeApprovals.AnyAsync(
            approval =>
                approval.RequestId == requestId
                && approval.ApprovedByRole == approverRole
                && approval.IsApproved == true,
            cancellationToken);
    }

    public async Task<IReadOnlyList<PendingApproverCandidate>> ListPendingApproversForRequestAsync(
        long requestId,
        CancellationToken cancellationToken)
    {
        var rows = await (
            from approval in _dbContext.UserSchoolChangeApprovals.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on approval.ApprovedByUserId equals user.Id
            where approval.RequestId == requestId
                  && approval.IsApproved == null
                  && approval.ApprovedAt == null
            select new
            {
                user.Id,
                user.FullName,
                user.Username,
                approval.ApprovedByRole,
            }).ToListAsync(cancellationToken);

        return rows
            .Select(row => new PendingApproverCandidate(
                row.Id,
                row.FullName,
                row.Username,
                row.ApprovedByRole))
            .ToList();
    }
}
