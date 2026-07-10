using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Classes;

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
