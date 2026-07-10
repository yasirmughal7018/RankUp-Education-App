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

    public Task<Notification?> GetByIdForUserAsync(
        long notificationId,
        long userId,
        CancellationToken cancellationToken)
    {
        return _dbContext.Notifications
            .FirstOrDefaultAsync(
                notification => notification.Id == notificationId && notification.UserId == userId,
                cancellationToken);
    }

    public async Task MarkCategoryReadAsync(long userId, string category, CancellationToken cancellationToken)
    {
        var items = await _dbContext.Notifications
            .Where(notification =>
                notification.UserId == userId
                && notification.Category == category
                && !notification.IsRead)
            .ToListAsync(cancellationToken);

        foreach (var item in items)
        {
            item.MarkRead();
        }
    }
}
