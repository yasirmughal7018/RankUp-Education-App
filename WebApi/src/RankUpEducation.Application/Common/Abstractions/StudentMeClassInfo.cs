namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>Class placement for the signed-in student self-view.</summary>
public sealed record StudentMeClassInfo(
    string FullName,
    string Username,
    string RollNumber,
    short Grade,
    string Section,
    string? SchoolName,
    string? CampusName);
