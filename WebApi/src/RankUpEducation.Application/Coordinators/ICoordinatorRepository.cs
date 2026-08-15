using RankUpEducation.Contracts.Directory;

namespace RankUpEducation.Application.Coordinators;

public interface ICoordinatorRepository
{
    Task ReplaceClassSectionsAsync(
        long coordinatorUserId,
        IReadOnlyList<CoordinatorClassSectionItem> classSections,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<CoordinatorClassSectionItem>> GetClassSectionsAsync(
        long coordinatorUserId,
        CancellationToken cancellationToken);

    Task<IReadOnlyDictionary<long, IReadOnlyList<CoordinatorClassSectionItem>>> GetClassSectionsByUserIdsAsync(
        IReadOnlyList<long> coordinatorUserIds,
        CancellationToken cancellationToken);
}
