namespace RankUpEducation.Contracts.Competitions;

public sealed record CompetitionResponse(
    long Id,
    string Title,
    string Status,
    DateTimeOffset? StartsAt,
    DateTimeOffset? EndsAt);

public sealed record CompetitionListResponse(IReadOnlyList<CompetitionResponse> Items);
