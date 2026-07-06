using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Teachers;

public sealed class Teacher : SoftDeleteEntity
{
    private Teacher()
    {
    }

    public Teacher(long userId, int schoolId, int campusId, string teacherCode, string? mobileNumber = null)
    {
        Id = userId;
        SchoolId = schoolId;
        CampusId = campusId;
        TeacherCode = teacherCode.Trim();
        MobileNumber = string.IsNullOrWhiteSpace(mobileNumber) ? null : mobileNumber.Trim();
    }

    public int SchoolId { get; private set; }
    public int CampusId { get; private set; }
    public string TeacherCode { get; private set; } = string.Empty;
    public string? Cnic { get; private set; }
    public string? MobileNumber { get; private set; }
    public DateTimeOffset ModifiedDate { get; private set; } = DateTimeOffset.UtcNow;
}
