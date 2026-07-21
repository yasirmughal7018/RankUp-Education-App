using RankUpEducation.Domain.Notifications;

namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>Persistence access for in-app notifications.</summary>
public interface INotificationRepository
{
    /// <summary>Inserts one or more notifications in a single batch.</summary>
    Task AddRangeAsync(IEnumerable<Notification> notifications, CancellationToken cancellationToken);

    /// <summary>Lists the most recent notifications for a user, newest first.</summary>
    Task<IReadOnlyList<Notification>> ListForUserAsync(long userId, int take, CancellationToken cancellationToken);

    /// <summary>Loads a notification only when it belongs to the given user.</summary>
    Task<Notification?> GetByIdForUserAsync(long notificationId, long userId, CancellationToken cancellationToken);

    /// <summary>Marks all unread notifications in a category as read for the user.</summary>
    Task MarkCategoryReadAsync(long userId, string category, CancellationToken cancellationToken);
}
