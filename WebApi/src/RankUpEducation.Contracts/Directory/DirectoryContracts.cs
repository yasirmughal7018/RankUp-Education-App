namespace RankUpEducation.Contracts.Directory;

public sealed record SchoolListResponse(IReadOnlyList<SchoolResponse> Items);

public sealed record SchoolResponse(long Id, string Name, string Code, bool IsActive);

public sealed record UpsertSchoolRequest(string Name, string Code, bool IsActive = true);

public sealed record CampusListResponse(IReadOnlyList<CampusResponse> Items);

public sealed record CampusResponse(long Id, long SchoolId, string Name, string? Address, bool IsActive);

public sealed record UpsertCampusRequest(string Name, string? Address, bool IsActive = true);

public sealed record DirectoryStudentListResponse(IReadOnlyList<DirectoryStudentResponse> Items);

public sealed record DirectoryStudentResponse(
    long StudentId,
    string FullName,
    string Username,
    string RollNumber,
    short Grade,
    string Section,
    int SchoolId,
    int CampusId,
    bool IsActive);

public sealed record DirectoryTeacherListResponse(IReadOnlyList<DirectoryTeacherResponse> Items);

public sealed record DirectoryTeacherResponse(
    long TeacherId,
    string FullName,
    string Username,
    string TeacherCode,
    int SchoolId,
    int CampusId,
    bool IsActive);

public sealed record DirectoryParentListResponse(IReadOnlyList<DirectoryParentResponse> Items);

public sealed record DirectoryParentResponse(
    long ParentId,
    string FullName,
    string Username,
    int LinkedStudentCount,
    bool IsActive);

public sealed record LinkParentStudentRequest(long StudentId, string Relationship = "Guardian");

public sealed record LinkParentStudentResponse(
    long ParentId,
    long StudentId,
    string Relationship,
    bool IsActive);
