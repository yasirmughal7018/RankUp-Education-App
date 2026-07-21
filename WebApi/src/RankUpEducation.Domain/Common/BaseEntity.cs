namespace RankUpEducation.Domain.Common;

/// <summary>Base type for persisted entities with a surrogate primary key.</summary>
public abstract class BaseEntity
{
    /// <summary>Surrogate primary key assigned by the database.</summary>
    public long Id { get; protected set; }
}
