namespace RankUpEducation.Domain.Common;

public abstract class AuditableEntity : BaseEntity
{
    public DateTimeOffset CreatedAt { get; private set; } = DateTimeOffset.UtcNow;
    public long? CreatedBy { get; private set; }
    public DateTimeOffset? UpdatedAt { get; private set; }
    public long? UpdatedBy { get; private set; }

    public void MarkCreated(DateTimeOffset createdAt, long? createdBy)
    {
        CreatedAt = createdAt;
        CreatedBy = createdBy;
    }

    public void MarkUpdated(DateTimeOffset updatedAt, long? updatedBy)
    {
        UpdatedAt = updatedAt;
        UpdatedBy = updatedBy;
    }
}
