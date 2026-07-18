namespace RankUpEducation.Contracts.Messaging;

public sealed record MessageThreadResponse(
    long Id,
    string Subject,
    string LastPreview,
    DateTimeOffset? LastMessageAt,
    int UnreadCount);

public sealed record MessageThreadListResponse(IReadOnlyList<MessageThreadResponse> Items);
