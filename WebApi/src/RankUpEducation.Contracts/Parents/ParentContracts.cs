namespace RankUpEducation.Contracts.Parents;

public sealed record LinkedStudentResponse(
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

public sealed record LinkedStudentListResponse(IReadOnlyList<LinkedStudentResponse> Items);

/// <summary>Parent self-link: find a student by CNIC or username (email).</summary>
public sealed record LinkMyChildRequest(
    string Identifier,
    string? Relationship = null);

/// <summary>Result of a parent linking a child by CNIC or username.</summary>
public sealed record LinkMyChildResponse(
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
    string AccountStatus,
    bool AlreadyLinked);

