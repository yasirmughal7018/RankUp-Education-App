using RankUpEducation.Domain.Students;

namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>Student class/section placement history (promotions and initial placement).</summary>
public interface IStudentClassHistoryRepository
{
    Task RecordInitialAsync(
        long studentId,
        short grade,
        string section,
        int? schoolId,
        int? campusId,
        long? changedByUserId,
        string source,
        DateTimeOffset at,
        CancellationToken cancellationToken);

    /// <summary>
    /// Closes the open placement (if any) and opens a new one when grade/section change.
    /// No-op when grade and section are unchanged.
    /// </summary>
    Task RecordChangeAsync(
        long studentId,
        short fromGrade,
        string fromSection,
        short toGrade,
        string toSection,
        int? schoolId,
        int? campusId,
        long? changedByUserId,
        string source,
        DateTimeOffset at,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<StudentClassHistoryListItem>> ListForStudentAsync(
        long studentId,
        CancellationToken cancellationToken);
}

public sealed record StudentClassHistoryListItem(
    long Id,
    short Grade,
    string GradeLabel,
    string Section,
    string? SchoolName,
    string? CampusName,
    DateTimeOffset StartedAt,
    DateTimeOffset? EndedAt,
    bool IsCurrent,
    string Source);
