namespace RankUpEducation.Contracts.Notifications;

public sealed record NotificationResponse(
    long Id,
    string Title,
    string Body,
    string Category,
    bool IsRead,
    DateTimeOffset CreatedAt);

public sealed record NotificationListResponse(IReadOnlyList<NotificationResponse> Items);
