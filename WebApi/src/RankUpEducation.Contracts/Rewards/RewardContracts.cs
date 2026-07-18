namespace RankUpEducation.Contracts.Rewards;

public sealed record RewardItemResponse(
    long Id,
    string Title,
    string Description,
    int Points,
    DateTimeOffset? EarnedAt);

public sealed record RewardSummaryResponse(
    int TotalPoints,
    IReadOnlyList<RewardItemResponse> Items);
