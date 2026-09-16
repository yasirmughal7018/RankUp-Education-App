namespace RankUpEducation.Contracts.Students;

/// <summary>One person linked or assigned to the signed-in student.</summary>
public sealed record StudentMePersonResponse(
    string FullName,
    string? Detail);

/// <summary>Signed-in student's class placement and assigned people.</summary>
public sealed record StudentMeOverviewResponse(
    string FullName,
    string Username,
    string RollNumber,
    short Grade,
    string Section,
    string? SchoolName,
    string? CampusName,
    IReadOnlyList<StudentMePersonResponse> Parents,
    IReadOnlyList<StudentMePersonResponse> Coordinators,
    IReadOnlyList<StudentMePersonResponse> Teachers);

/// <summary>One class/section placement period for the signed-in student.</summary>
public sealed record StudentClassHistoryItemResponse(
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

/// <summary>Class history for the signed-in student (newest first).</summary>
public sealed record StudentClassHistoryResponse(
    IReadOnlyList<StudentClassHistoryItemResponse> Items);
