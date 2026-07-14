namespace RankUpEducation.Application.Common.Abstractions;

public sealed record LookupListItem(
    short Id,
    string Name,
    string Type,
    short? ParentId);

public interface ILookupRepository
{
    Task<short> ResolveLookupIdAsync(string type, string name, short fallback, CancellationToken cancellationToken);

    Task<string> GetLookupNameAsync(short id, CancellationToken cancellationToken);

    Task<short> ResolveLookupIdByNamesAsync(
        string type,
        IReadOnlyList<string> names,
        short fallback,
        CancellationToken cancellationToken);

    /// <summary>Returns the lookup when id exists and matches type; otherwise null.</summary>
    Task<LookupListItem?> GetByIdAndTypeAsync(
        short id,
        string type,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<LookupListItem>> ListActiveAsync(
        string? type,
        short? parentId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<string>> ListTypesAsync(CancellationToken cancellationToken);
}
