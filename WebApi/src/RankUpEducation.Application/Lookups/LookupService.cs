using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Contracts.Lookups;

namespace RankUpEducation.Application.Lookups;

/// <summary>Read-only lookup catalog for dropdowns and client reference data.</summary>
public interface ILookupService
{
    /// <summary>Lists active lookups, optionally filtered by type and parent id.</summary>
    Task<LookupListResponse> ListAsync(string? type, short? parentId, CancellationToken cancellationToken);

    /// <summary>Lists distinct active lookup type names.</summary>
    Task<LookupTypesResponse> ListTypesAsync(CancellationToken cancellationToken);
}

/// <inheritdoc cref="ILookupService"/>
public sealed class LookupService : ILookupService
{
    private readonly ILookupRepository _lookups;

    public LookupService(ILookupRepository lookups)
    {
        _lookups = lookups;
    }

    public async Task<LookupListResponse> ListAsync(
        string? type,
        short? parentId,
        CancellationToken cancellationToken)
    {
        var items = await _lookups.ListActiveAsync(type, parentId, cancellationToken);
        return new LookupListResponse(items
            .Select(item => new LookupItemResponse(item.Id, item.Name, item.Type, item.ParentId))
            .ToArray());
    }

    public async Task<LookupTypesResponse> ListTypesAsync(CancellationToken cancellationToken)
    {
        var types = await _lookups.ListTypesAsync(cancellationToken);
        return new LookupTypesResponse(types);
    }
}
