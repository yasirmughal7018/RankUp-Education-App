using RankUpEducation.Domain.Notifications;

namespace RankUpEducation.Application.Common.Abstractions;

public interface INotificationRepository
{
    Task AddRangeAsync(IEnumerable<Notification> notifications, CancellationToken cancellationToken);

    Task<IReadOnlyList<Notification>> ListForUserAsync(long userId, int take, CancellationToken cancellationToken);
}
