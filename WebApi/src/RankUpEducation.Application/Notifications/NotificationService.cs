using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Contracts.Notifications;
using RankUpEducation.Domain.Notifications;

namespace RankUpEducation.Application.Notifications;

public sealed class NotificationService : INotificationService
{
    private readonly INotificationRepository _notifications;
    private readonly IUnitOfWork _unitOfWork;

    public NotificationService(INotificationRepository notifications, IUnitOfWork unitOfWork)
    {
        _notifications = notifications;
        _unitOfWork = unitOfWork;
    }

    public async Task CreateAsync(
        IReadOnlyList<long> userIds,
        string title,
        string body,
        string category,
        CancellationToken cancellationToken)
    {
        if (userIds.Count == 0)
        {
            return;
        }

        var distinctIds = userIds.Distinct().ToArray();
        var entities = distinctIds
            .Select(userId => new Notification(userId, title, body, category))
            .ToArray();

        await _notifications.AddRangeAsync(entities, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<NotificationListResponse> ListForUserAsync(
        long userId,
        int take,
        CancellationToken cancellationToken)
    {
        var safeTake = Math.Clamp(take, 1, 100);
        var items = await _notifications.ListForUserAsync(userId, safeTake, cancellationToken);
        return new NotificationListResponse(
            items.Select(notification => new NotificationResponse(
                notification.Id,
                notification.Title,
                notification.Body,
                notification.Category,
                notification.IsRead,
                notification.CreatedAt)).ToArray());
    }
}
