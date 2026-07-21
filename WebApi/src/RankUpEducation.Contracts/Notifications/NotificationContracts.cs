namespace RankUpEducation.Contracts.Notifications;

/// <summary>Single in-app notification row for the authenticated user.</summary>
public sealed record NotificationResponse(
    long Id,
    string Title,
    string Body,
    string Category,
    bool IsRead,
    DateTimeOffset CreatedAt);

/// <summary>Recent notifications returned by the inbox endpoint.</summary>
public sealed record NotificationListResponse(IReadOnlyList<NotificationResponse> Items);
