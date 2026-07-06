using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Students;

public sealed class StudentGroup : BaseEntity
{
    private StudentGroup()
    {
        GroupName = string.Empty;
        Description = string.Empty;
    }

    public StudentGroup(long referralId, string groupName, string description, string creatorRole)
    {
        ReferralId = referralId;
        GroupName = groupName.Trim();
        Description = description.Trim();
        CreatorRole = creatorRole.Trim().ToLowerInvariant();
    }

    public long ReferralId { get; private set; }
    public string GroupName { get; private set; }
    public string Description { get; private set; }
    public bool IsTeacherGroup { get; private set; } = true;
    public bool IsActive { get; private set; } = true;
    public DateOnly CreatedDate { get; private set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public DateOnly UpdatedDate { get; private set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public string? CreatorRole { get; private set; }
}
