namespace RankUpEducation.Contracts.Messaging;

/// <summary>Message thread summary for inbox lists (messaging not yet fully implemented).</summary>
public sealed record MessageThreadResponse(
    long Id,
    string Subject,
    string LastPreview,
    DateTimeOffset? LastMessageAt,
    int UnreadCount);

/// <summary>Paged or listed message threads.</summary>
public sealed record MessageThreadListResponse(IReadOnlyList<MessageThreadResponse> Items);
