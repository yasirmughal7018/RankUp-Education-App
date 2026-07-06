namespace RankUpEducation.Domain.Common;

public abstract class SoftDeleteEntity : AuditableEntity
{
    public bool IsDeleted { get; private set; }
    public DateTimeOffset? DeletedAt { get; private set; }
    public long? DeletedBy { get; private set; }

    public void SoftDelete(DateTimeOffset deletedAt, long? deletedBy)
    {
        IsDeleted = true;
        DeletedAt = deletedAt;
        DeletedBy = deletedBy;
    }
}
