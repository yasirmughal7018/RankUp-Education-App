using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

public sealed class LookupRepository : ILookupRepository
{
    private readonly RankUpDbContext _dbContext;

    public LookupRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<short> ResolveLookupIdAsync(
        string type,
        string name,
        short fallback,
        CancellationToken cancellationToken)
    {
        var id = await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => lookup.Type == type && lookup.Name == name)
            .Select(lookup => lookup.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return id == 0 ? fallback : id;
    }

    public async Task<string> GetLookupNameAsync(short id, CancellationToken cancellationToken)
    {
        var name = await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => lookup.Id == id)
            .Select(lookup => lookup.Name)
            .FirstOrDefaultAsync(cancellationToken);

        return name ?? "Unknown";
    }

    public async Task<short> ResolveLookupIdByNamesAsync(
        string type,
        IReadOnlyList<string> names,
        short fallback,
        CancellationToken cancellationToken)
    {
        foreach (var name in names)
        {
            var id = await ResolveLookupIdAsync(type, name, 0, cancellationToken);
            if (id != 0)
            {
                return id;
            }
        }

        return fallback;
    }

    public async Task<LookupListItem?> GetByIdAndTypeAsync(
        short id,
        string type,
        CancellationToken cancellationToken)
    {
        return await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => lookup.Id == id && lookup.Type == type)
            .Select(lookup => new LookupListItem(
                lookup.Id,
                lookup.Name,
                lookup.Type,
                lookup.LookupRefId))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<short> ResolveLookupIdOrNameAsync(
        string type,
        string token,
        CancellationToken cancellationToken)
    {
        var normalized = token.Trim();
        if (normalized.Length == 0)
        {
            return 0;
        }

        if (short.TryParse(normalized, out var id))
        {
            var byId = await GetByIdAndTypeAsync(id, type, cancellationToken);
            if (byId is not null)
            {
                return byId.Id;
            }
        }

        var lower = normalized.ToLowerInvariant();
        return await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => lookup.Type == type && lookup.Name.ToLower() == lower)
            .Select(lookup => lookup.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<LookupListItem>> ListActiveAsync(
        string? type,
        short? parentId,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Lookups.AsNoTracking()
            .Where(lookup => lookup.IsActive);

        if (!string.IsNullOrWhiteSpace(type))
        {
            query = query.Where(lookup => lookup.Type == type);
        }

        if (parentId.HasValue)
        {
            query = query.Where(lookup => lookup.LookupRefId == parentId.Value);
        }

        return await query
            .OrderBy(lookup => lookup.OrderBy)
            .ThenBy(lookup => lookup.Name)
            .Select(lookup => new LookupListItem(
                lookup.Id,
                lookup.Name,
                lookup.Type,
                lookup.LookupRefId))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<string>> ListTypesAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => lookup.IsActive)
            .Select(lookup => lookup.Type)
            .Distinct()
            .OrderBy(type => type)
            .ToListAsync(cancellationToken);
    }
}
