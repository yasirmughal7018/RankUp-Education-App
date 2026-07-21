namespace RankUpEducation.Domain.Common;

/// <summary>Auditable entity that supports logical deletion instead of physical removal.</summary>
public abstract class SoftDeleteEntity : AuditableEntity
{
    public bool IsDeleted { get; private set; }
    public DateTimeOffset? DeletedAt { get; private set; }
    public long? DeletedBy { get; private set; }

    /// <summary>Marks the entity as deleted while retaining the row for audit and referential integrity.</summary>
    public void SoftDelete(DateTimeOffset deletedAt, long? deletedBy)
    {
        IsDeleted = true;
        DeletedAt = deletedAt;
        DeletedBy = deletedBy;
    }
}
