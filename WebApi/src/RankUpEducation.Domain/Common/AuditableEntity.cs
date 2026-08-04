namespace RankUpEducation.Domain.Common;

/// <summary>Entity with created/updated audit columns populated by <see cref="RankUpEducation.Infrastructure.Persistence.RankUpDbContext"/>.</summary>
public abstract class AuditableEntity : BaseEntity
{
    public DateTimeOffset CreatedAt { get; private set; } = DateTimeOffset.UtcNow;
    public long? CreatedBy { get; private set; }
    public DateTimeOffset? UpdatedAt { get; private set; }
    public long? UpdatedBy { get; private set; }

    /// <summary>Sets creation audit fields when the entity is first persisted.</summary>
    public void MarkCreated(DateTimeOffset createdAt, long? createdBy)
    {
        CreatedAt = createdAt;
        CreatedBy = createdBy;
    }

    /// <summary>Sets update audit fields when the entity is modified.</summary>
    public void MarkUpdated(DateTimeOffset updatedAt, long? updatedBy)
    {
        UpdatedAt = updatedAt;
        UpdatedBy = updatedBy;
    }
}
