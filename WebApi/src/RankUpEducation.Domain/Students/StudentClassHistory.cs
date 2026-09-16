using RankUpEducation.Common.Utilities;

namespace RankUpEducation.Domain.Students;

/// <summary>
/// One class/section placement period for a student (table: app_user_student_class_history).
/// Open rows have <see cref="EndedAt"/> null; closed when the student moves to another class.
/// </summary>
public sealed class StudentClassHistory
{
    private StudentClassHistory()
    {
    }

    private StudentClassHistory(
        long studentId,
        short grade,
        string section,
        int? schoolId,
        int? campusId,
        DateTimeOffset startedAt,
        long? changedByUserId,
        string source)
    {
        StudentId = studentId;
        Grade = grade;
        Section = section.AsTrimmedOrDefault("A");
        SchoolId = schoolId;
        CampusId = campusId;
        StartedAt = startedAt;
        ChangedByUserId = changedByUserId;
        Source = source.AsTrimmedOrDefault("DirectoryUpdate");
    }

    public long Id { get; private set; }
    public long StudentId { get; private set; }
    public short Grade { get; private set; }
    public string Section { get; private set; } = string.Empty;
    public int? SchoolId { get; private set; }
    public int? CampusId { get; private set; }
    public DateTimeOffset StartedAt { get; private set; }
    public DateTimeOffset? EndedAt { get; private set; }
    public long? ChangedByUserId { get; private set; }
    public string Source { get; private set; } = string.Empty;

    public bool IsCurrent => EndedAt is null;

    public static StudentClassHistory Start(
        long studentId,
        short grade,
        string section,
        int? schoolId,
        int? campusId,
        DateTimeOffset startedAt,
        long? changedByUserId,
        string source)
    {
        if (grade <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(grade), "Grade must be greater than zero.");
        }

        return new StudentClassHistory(
            studentId,
            grade,
            section,
            schoolId,
            campusId,
            startedAt,
            changedByUserId,
            source);
    }

    public void End(DateTimeOffset endedAt)
    {
        if (EndedAt is not null)
        {
            return;
        }

        EndedAt = endedAt < StartedAt ? StartedAt : endedAt;
    }
}

/// <summary>How a class history row was created.</summary>
public static class StudentClassHistorySources
{
    public const string Initial = "Initial";
    public const string DirectoryCreate = "DirectoryCreate";
    public const string DirectoryUpdate = "DirectoryUpdate";
    public const string RegistrationActivate = "RegistrationActivate";
}
