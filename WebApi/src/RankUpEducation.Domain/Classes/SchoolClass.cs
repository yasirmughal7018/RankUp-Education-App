using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Classes;

/// <summary>Named class or section within a school, optionally scoped to a campus.</summary>
public sealed class SchoolClass : SoftDeleteEntity
{
    private SchoolClass()
    {
        Name = string.Empty;
    }

    public SchoolClass(long schoolId, long? campusId, string name)
    {
        SchoolId = schoolId;
        CampusId = campusId;
        Name = name.AsTrimmedString();
    }

    public long SchoolId { get; private set; }
    public long? CampusId { get; private set; }
    public string Name { get; private set; }
}
