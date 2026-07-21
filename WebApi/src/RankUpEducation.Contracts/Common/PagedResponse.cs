namespace RankUpEducation.Contracts.Common;

/// <summary>Page of items with total count and derived page count.</summary>
public sealed record PagedResponse<T>(
    IReadOnlyList<T> Items,
    int PageNumber,
    int PageSize,
    int TotalCount)
{
    /// <summary>Total pages given <see cref="PageSize"/>; zero when page size is zero.</summary>
    public int TotalPages => PageSize == 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}
