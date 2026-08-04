namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>Unit-of-work boundary for committing EF Core changes in application services.</summary>
public interface IUnitOfWork
{
    /// <summary>Persists pending changes to the database.</summary>
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
