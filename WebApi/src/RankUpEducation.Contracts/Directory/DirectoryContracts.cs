namespace RankUpEducation.Contracts.Directory;

/// <summary>
/// User lifecycle counts aligned with login-status / QA state machine.
/// <see cref="Active"/> = users with <c>is_active=true</c> (ActiveReady + NeedsPasswordSetup).
/// The six status fields below are mutually exclusive and sum to <see cref="Total"/>.
/// </summary>
public sealed record DirectoryStatusCounts(
    int Active,
    int ActiveReady,
    int PendingApproval,
    int NeedsPasswordSetup,
    int Locked,
    int Deactivated,
    int Rejected,
    int Total);

public sealed record DirectorySchoolStatusCounts(int Active, int Inactive, int Total);

public sealed record DirectorySummaryResponse(
    DirectorySchoolStatusCounts Schools,
    DirectoryStatusCounts Students,
    DirectoryStatusCounts Parents,
    DirectoryStatusCounts Teachers,
    DirectoryStatusCounts SchoolAdmins,
    DirectoryStatusCounts CampusAdmins,
    IReadOnlyList<string> VisibleSections);

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

public sealed record DirectorySchoolAdminListResponse(
    IReadOnlyList<DirectorySchoolAdminResponse> Items,
    int PageNumber,
    int PageSize,
    int TotalCount);

public sealed record DirectorySchoolAdminResponse(
    long UserId,
    string FullName,
    string Username,
    int SchoolId,
    string SchoolName,
    string? MobileNumber,
    string? Cnic,
    bool IsActive,
    bool NeedsPasswordSetup);

public sealed record CreateDirectorySchoolAdminRequest(
    string FullName,
    string Username,
    int SchoolId,
    string? MobileNumber = null,
    string? Cnic = null,
    string? EmailAddress = null);

public sealed record UpdateDirectorySchoolAdminRequest(
    string FullName,
    int SchoolId,
    string? MobileNumber = null,
    string? Cnic = null,
    string? EmailAddress = null);

public sealed record DirectoryCampusAdminListResponse(
    IReadOnlyList<DirectoryCampusAdminResponse> Items,
    int PageNumber,
    int PageSize,
    int TotalCount);

public sealed record DirectoryCampusAdminResponse(
    long UserId,
    string FullName,
    string Username,
    int SchoolId,
    string SchoolName,
    int CampusId,
    string CampusName,
    string? MobileNumber,
    string? Cnic,
    bool IsActive,
    bool NeedsPasswordSetup);

public sealed record CreateDirectoryCampusAdminRequest(
    string FullName,
    string Username,
    int SchoolId,
    int CampusId,
    string? MobileNumber = null,
    string? Cnic = null,
    string? EmailAddress = null);

public sealed record UpdateDirectoryCampusAdminRequest(
    string FullName,
    int SchoolId,
    int CampusId,
    string? MobileNumber = null,
    string? Cnic = null,
    string? EmailAddress = null);
