using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Attendance;

public sealed class AttendanceRecord : AuditableEntity
{
    private AttendanceRecord()
    {
        Status = string.Empty;
    }

    public AttendanceRecord(long studentId, long classId, DateOnly attendanceDate, string status)
    {
        StudentId = studentId;
        ClassId = classId;
        AttendanceDate = attendanceDate;
        Status = status.AsTrimmedString();
    }

    public long StudentId { get; private set; }
    public long ClassId { get; private set; }
    public DateOnly AttendanceDate { get; private set; }
    public string Status { get; private set; }
}
