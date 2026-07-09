using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Domain.Notifications;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

public sealed class NotificationRepository : INotificationRepository
{
    private readonly RankUpDbContext _dbContext;

    public NotificationRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddRangeAsync(IEnumerable<Notification> notifications, CancellationToken cancellationToken)
    {
        await _dbContext.Notifications.AddRangeAsync(notifications, cancellationToken);
    }

    public async Task<IReadOnlyList<Notification>> ListForUserAsync(
        long userId,
        int take,
        CancellationToken cancellationToken)
    {
        return await _dbContext.Notifications.AsNoTracking()
            .Where(notification => notification.UserId == userId)
            .OrderByDescending(notification => notification.CreatedAt)
            .Take(take)
            .ToListAsync(cancellationToken);
    }
}
