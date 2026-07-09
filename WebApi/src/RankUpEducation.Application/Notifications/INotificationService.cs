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
}
