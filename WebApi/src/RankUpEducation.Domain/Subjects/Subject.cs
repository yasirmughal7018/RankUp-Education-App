using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Subjects;

public sealed class Subject : SoftDeleteEntity
{
    private Subject()
    {
        Name = string.Empty;
    }

    public Subject(long schoolId, string name)
    {
        SchoolId = schoolId;
        Name = name.Trim();
    }

    public long SchoolId { get; private set; }
    public string Name { get; private set; }
}
