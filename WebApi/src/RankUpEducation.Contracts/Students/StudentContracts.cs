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
    IReadOnlyList<StudentMePersonResponse> Teachers,
    IReadOnlyList<StudentMePersonResponse> Tutors);
