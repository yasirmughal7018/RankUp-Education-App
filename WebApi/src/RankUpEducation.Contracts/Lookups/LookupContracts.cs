namespace RankUpEducation.Contracts.Lookups;

/// <summary>One active lookup option for client dropdowns.</summary>
public sealed record LookupItemResponse(
    short Id,
    string Name,
    string Type,
    short? ParentId);

/// <summary>Filtered lookup items for a type and optional parent.</summary>
public sealed record LookupListResponse(IReadOnlyList<LookupItemResponse> Items);

/// <summary>Distinct lookup type names available in the catalog.</summary>
public sealed record LookupTypesResponse(IReadOnlyList<string> Types);
