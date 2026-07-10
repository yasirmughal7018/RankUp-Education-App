using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Parents;

public sealed class ParentStudentRelation : BaseEntity
{
    private ParentStudentRelation()
    {
        Relationship = string.Empty;
    }

    public ParentStudentRelation(long parentId, long studentId, string relationship)
    {
        ParentId = parentId;
        StudentId = studentId;
        Relationship = relationship.AsTrimmedString();
    }

    public long ParentId { get; private set; }
    public long StudentId { get; private set; }
    public string Relationship { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateOnly CreatedDate { get; private set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    public void Activate(string relationship)
    {
        Relationship = relationship.AsTrimmedString();
        IsActive = true;
    }

    public void Deactivate()
    {
        IsActive = false;
    }
}
