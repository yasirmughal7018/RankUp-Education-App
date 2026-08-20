namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>Student linked to a parent account for scoped parent and report access.</summary>
public sealed record LinkedStudentInfo(
    long StudentId,
    string FullName,
    string Username,
    string RollNumber,
    short Grade,
    string Section,
    string Relationship,
    string? SchoolName,
    string? CampusName,
    bool IsActive,
    string AccountStatus);
