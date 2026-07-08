namespace RankUpEducation.Contracts.Directory;

public sealed record SchoolListResponse(IReadOnlyList<SchoolResponse> Items);

public sealed record SchoolResponse(long Id, string Name, string Code, bool IsActive);

public sealed record UpsertSchoolRequest(string Name, string Code, bool IsActive = true);

public sealed record CampusListResponse(IReadOnlyList<CampusResponse> Items);

public sealed record CampusResponse(long Id, long SchoolId, string Name, string? Address, bool IsActive);

public sealed record UpsertCampusRequest(string Name, string? Address, bool IsActive = true);

public sealed record DirectoryStudentListResponse(
    IReadOnlyList<DirectoryStudentResponse> Items,
    int PageNumber,
    int PageSize,
    int TotalCount);

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

public sealed record CreateDirectoryStudentRequest(
    string FullName,
    string Username,
    string Password,
    int SchoolId,
    int CampusId,
    string RollNumber,
    short Grade,
    string Section,
    string? MobileNumber = null);

public sealed record UpdateDirectoryStudentRequest(
    string FullName,
    int CampusId,
    string RollNumber,
    short Grade,
    string Section,
    string? MobileNumber = null);

public sealed record DirectoryTeacherListResponse(
    IReadOnlyList<DirectoryTeacherResponse> Items,
    int PageNumber,
    int PageSize,
    int TotalCount);

public sealed record DirectoryTeacherResponse(
    long TeacherId,
    string FullName,
    string Username,
    string TeacherCode,
    int SchoolId,
    int CampusId,
    bool IsActive);

public sealed record CreateDirectoryTeacherRequest(
    string FullName,
    string Username,
    string Password,
    int SchoolId,
    int CampusId,
    string TeacherCode,
    string? MobileNumber = null);

public sealed record UpdateDirectoryTeacherRequest(
    string FullName,
    int CampusId,
    string TeacherCode,
    string? MobileNumber = null);

public sealed record DirectoryParentListResponse(
    IReadOnlyList<DirectoryParentResponse> Items,
    int PageNumber,
    int PageSize,
    int TotalCount);

public sealed record DirectoryParentResponse(
    long ParentId,
    string FullName,
    string Username,
    int LinkedStudentCount,
    bool IsActive);

public sealed record CreateDirectoryParentRequest(
    string FullName,
    string Username,
    string Password,
    string? Cnic = null,
    string? MobileNumber = null);

public sealed record UpdateDirectoryParentRequest(
    string FullName,
    string? Cnic = null,
    string? MobileNumber = null);

public sealed record LinkParentStudentRequest(long StudentId, string Relationship = "Guardian");

public sealed record LinkParentStudentResponse(
    long ParentId,
    long StudentId,
    string Relationship,
    bool IsActive);

public sealed record BulkDeactivateRequest(IReadOnlyList<long> Ids);

public sealed record BulkActionResponse(int AffectedCount);
