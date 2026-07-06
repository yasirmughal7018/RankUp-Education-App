using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Schools;

public sealed class Campus : SoftDeleteEntity
{
    private Campus()
    {
        Name = string.Empty;
        Address = string.Empty;
    }

    public Campus(int schoolId, string name, string address)
    {
        SchoolId = schoolId;
        Name = name.Trim();
        Address = address.Trim();
        IsActive = true;
    }

    public int SchoolId { get; private set; }
    public string Name { get; private set; }
    public string Address { get; private set; }
    public bool IsActive { get; private set; }
    public DateOnly CreatedDate { get; private set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public DateOnly ModifiedDate { get; private set; } = DateOnly.FromDateTime(DateTime.UtcNow);
}
