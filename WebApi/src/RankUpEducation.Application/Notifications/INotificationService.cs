using RankUpEducation.Contracts.Notifications;

namespace RankUpEducation.Application.Notifications;

/// <summary>Creates and reads in-app notifications for authenticated users.</summary>
public interface INotificationService
{
    /// <summary>Fan-out creates the same notification for multiple user ids.</summary>
    Task CreateAsync(
        IReadOnlyList<long> userIds,
        string title,
        string body,
        string category,
        CancellationToken cancellationToken);

    /// <summary>Lists recent notifications for a user, capped by <paramref name="take"/>.</summary>
    Task<NotificationListResponse> ListForUserAsync(long userId, int take, CancellationToken cancellationToken);

    /// <summary>Marks a single notification read when it belongs to the user.</summary>
    Task MarkReadAsync(long userId, long notificationId, CancellationToken cancellationToken);

    /// <summary>Marks all unread notifications in a category as read.</summary>
    Task MarkCategoryReadAsync(long userId, string category, CancellationToken cancellationToken);
}
