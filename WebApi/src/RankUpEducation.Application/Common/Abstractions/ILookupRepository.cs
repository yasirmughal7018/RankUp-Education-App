namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>Lookup row projected for API and import resolution.</summary>
public sealed record LookupListItem(
    short Id,
    string Name,
    string Type,
    short? ParentId);

/// <summary>Read-only access to reference lookup tables.</summary>
public interface ILookupRepository
{
    /// <summary>Resolves a lookup id by exact type and name, returning <paramref name="fallback"/> when missing.</summary>
    Task<short> ResolveLookupIdAsync(string type, string name, short fallback, CancellationToken cancellationToken);

    /// <summary>Returns the display name for a lookup id, or <c>Unknown</c> when not found.</summary>
    Task<string> GetLookupNameAsync(short id, CancellationToken cancellationToken);

    /// <summary>Tries each name in order until one matches the given type.</summary>
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

    /// <summary>
    /// Resolves a lookup by numeric id (when token is a number) or by name (case-insensitive).
    /// Returns 0 when not found.
    /// </summary>
    Task<short> ResolveLookupIdOrNameAsync(
        string type,
        string token,
        CancellationToken cancellationToken);

    /// <summary>Lists active lookups, optionally filtered by type and parent lookup id.</summary>
    Task<IReadOnlyList<LookupListItem>> ListActiveAsync(
        string? type,
        short? parentId,
        CancellationToken cancellationToken);

    /// <summary>Returns distinct active lookup type names sorted alphabetically.</summary>
    Task<IReadOnlyList<string>> ListTypesAsync(CancellationToken cancellationToken);
}
