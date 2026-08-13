using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Teachers;

/// <summary>A class (grade) + section a teacher is assigned to teach.</summary>
public sealed class TeacherClassSection : BaseEntity
{
    private TeacherClassSection()
    {
        Section = string.Empty;
    }

    public TeacherClassSection(long teacherId, short grade, string section)
    {
        TeacherId = teacherId;
        Grade = grade;
        Section = section.AsTrimmedString();
    }

    public long TeacherId { get; private set; }
    public short Grade { get; private set; }
    public string Section { get; private set; }
    public bool IsActive { get; private set; } = true;

    public void Activate() => IsActive = true;

    public void Deactivate() => IsActive = false;
}
