using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Students;

public sealed class Student : SoftDeleteEntity
{
    private Student()
    {
    }

    public Student(long userId, int schoolId, int campusId, string rollNumber, short grade, string section, string? mobileNumber = null)
    {
        Id = userId;
        SchoolId = schoolId;
        CampusId = campusId;
        StudentRollNumber = rollNumber.Trim();
        Grade = grade;
        Section = section.Trim();
        MobileNumber = string.IsNullOrWhiteSpace(mobileNumber) ? null : mobileNumber.Trim();
    }

    public int SchoolId { get; private set; }
    public int CampusId { get; private set; }
    public string StudentRollNumber { get; private set; } = string.Empty;
    public string? Cnic { get; private set; }
    public string? MobileNumber { get; private set; }
    public short Grade { get; private set; }
    public string Section { get; private set; } = string.Empty;
    public DateTimeOffset ModifiedDate { get; private set; } = DateTimeOffset.UtcNow;
}
