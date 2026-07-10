using RankUpEducation.Contracts.Notifications;

namespace RankUpEducation.Application.Notifications;

public interface INotificationService
{
    Task CreateAsync(
        IReadOnlyList<long> userIds,
        string title,
        string body,
        string category,
        CancellationToken cancellationToken);

    Task<NotificationListResponse> ListForUserAsync(long userId, int take, CancellationToken cancellationToken);

    Task MarkReadAsync(long userId, long notificationId, CancellationToken cancellationToken);

    Task MarkCategoryReadAsync(long userId, string category, CancellationToken cancellationToken);
}
