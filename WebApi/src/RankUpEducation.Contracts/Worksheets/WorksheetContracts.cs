namespace RankUpEducation.Contracts.Worksheets;

public sealed record WorksheetResponse(
    long Id,
    string Title,
    string Subject,
    string Status,
    DateTimeOffset? DueAt);

public sealed record WorksheetListResponse(IReadOnlyList<WorksheetResponse> Items);
