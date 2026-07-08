using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Contracts.Lookups;

namespace RankUpEducation.Application.Lookups;

public interface ILookupService
{
    Task<LookupListResponse> ListAsync(string? type, short? parentId, CancellationToken cancellationToken);

    Task<LookupTypesResponse> ListTypesAsync(CancellationToken cancellationToken);
}

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
