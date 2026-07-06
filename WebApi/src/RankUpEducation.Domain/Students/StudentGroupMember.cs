using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Students;

public sealed class StudentGroupMember : BaseEntity
{
    private StudentGroupMember()
    {
    }

    public StudentGroupMember(long studentGroupId, long studentId)
    {
        StudentGroupId = studentGroupId;
        StudentId = studentId;
    }

    public long StudentGroupId { get; private set; }
    public long StudentId { get; private set; }
    public DateOnly CreatedDate { get; private set; } = DateOnly.FromDateTime(DateTime.UtcNow);
}
