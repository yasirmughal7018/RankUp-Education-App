using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Coordinators;
using RankUpEducation.Contracts.Directory;
using RankUpEducation.Domain.Coordinators;
using RankUpEducation.Infrastructure.Persistence;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

public sealed class CoordinatorRepository : ICoordinatorRepository
{
    private readonly RankUpDbContext _dbContext;

    public CoordinatorRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task ReplaceClassSectionsAsync(
        long coordinatorUserId,
        IReadOnlyList<CoordinatorClassSectionItem> classSections,
        CancellationToken cancellationToken)
    {
        var desiredGrades = classSections
            .Where(item => item.Grade > 0)
            .Select(item => item.Grade)
            .Distinct()
            .ToHashSet();

        var existing = await _dbContext.CoordinatorClassSections
            .Where(item => item.CoordinatorUserId == coordinatorUserId)
            .ToListAsync(cancellationToken);

        foreach (var row in existing)
        {
            // Keep only full-class rows for desired grades; drop section-specific legacy rows.
            if (desiredGrades.Contains(row.Grade) && row.IsFullClass)
            {
                row.Activate();
            }
            else
            {
                row.Deactivate();
            }
        }

        foreach (var grade in desiredGrades.OrderBy(value => value))
        {
            if (existing.Any(row => row.Grade == grade && row.IsFullClass))
            {
                continue;
            }

            await _dbContext.CoordinatorClassSections.AddAsync(
                CoordinatorClassSection.ForFullClass(coordinatorUserId, grade),
                cancellationToken);
        }
    }

    public async Task<IReadOnlyList<CoordinatorClassSectionItem>> GetClassSectionsAsync(
        long coordinatorUserId,
        CancellationToken cancellationToken)
    {
        var grades = await _dbContext.CoordinatorClassSections.AsNoTracking()
            .Where(item => item.CoordinatorUserId == coordinatorUserId && item.IsActive)
            .Select(item => item.Grade)
            .Distinct()
            .OrderBy(grade => grade)
            .ToListAsync(cancellationToken);

        return grades.Select(grade => new CoordinatorClassSectionItem(grade)).ToArray();
    }

    public async Task<IReadOnlyDictionary<long, IReadOnlyList<CoordinatorClassSectionItem>>> GetClassSectionsByUserIdsAsync(
        IReadOnlyList<long> coordinatorUserIds,
        CancellationToken cancellationToken)
    {
        if (coordinatorUserIds.Count == 0)
        {
            return new Dictionary<long, IReadOnlyList<CoordinatorClassSectionItem>>();
        }

        var rows = await _dbContext.CoordinatorClassSections.AsNoTracking()
            .Where(item => coordinatorUserIds.Contains(item.CoordinatorUserId) && item.IsActive)
            .Select(item => new { item.CoordinatorUserId, item.Grade })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(row => row.CoordinatorUserId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<CoordinatorClassSectionItem>)group
                    .Select(row => row.Grade)
                    .Distinct()
                    .OrderBy(grade => grade)
                    .Select(grade => new CoordinatorClassSectionItem(grade))
                    .ToArray());
    }
}
