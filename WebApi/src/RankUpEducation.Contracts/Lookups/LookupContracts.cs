namespace RankUpEducation.Contracts.Lookups;

public sealed record LookupItemResponse(
    short Id,
    string Name,
    string Type,
    short? ParentId);

public sealed record LookupListResponse(IReadOnlyList<LookupItemResponse> Items);

public sealed record LookupTypesResponse(IReadOnlyList<string> Types);
