using RankUpEducation.Contracts.Teachers;

namespace RankUpEducation.Contracts.Directory;

/// <summary>
/// User lifecycle counts aligned with login-status / QA state machine
/// (<c>02_RankUp_User_Creation_Approval_QA</c>).
/// <list type="bullet">
/// <item><see cref="Active"/> / <see cref="ActiveReady"/> = Ready (<c>is_active</c> + password set).</item>
/// <item><see cref="NeedsPasswordSetup"/> = approved, password not set (not Active).</item>
/// <item><see cref="PendingApproval"/> = pending registration.</item>
/// <item><see cref="Locked"/> = school/campus change lock.</item>
/// <item><see cref="Deactivated"/> = inactive with password, no pending school change.</item>
/// <item><see cref="Rejected"/> = soft-rejected registration.</item>
/// </list>
/// The six status buckets are mutually exclusive and sum to <see cref="Total"/>.
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

/// <summary>Active/inactive school counts for the directory summary.</summary>
public sealed record DirectorySchoolStatusCounts(int Active, int Inactive, int Total);

/// <summary>Directory dashboard payload with per-section counts and UI section keys.</summary>
public sealed record DirectorySummaryResponse(
    DirectorySchoolStatusCounts Schools,
    DirectoryStatusCounts Students,
    DirectoryStatusCounts Parents,
    DirectoryStatusCounts Teachers,
    DirectoryStatusCounts SchoolAdmins,
    DirectoryStatusCounts CampusAdmins,
    DirectoryStatusCounts Coordinators,
    DirectoryStatusCounts Tutors,
    IReadOnlyList<string> VisibleSections);

/// <summary>Non-paged list of schools.</summary>
public sealed record SchoolListResponse(IReadOnlyList<SchoolResponse> Items);

/// <summary>School row for directory and registration pickers.</summary>
public sealed record SchoolResponse(
    long Id,
    string Name,
    string Code,
    bool IsActive,
    int CampusCount);

/// <summary>Create or update school request body.</summary>
public sealed record UpsertSchoolRequest(string Name, string Code, bool IsActive = true);

/// <summary>Non-paged list of campuses.</summary>
public sealed record CampusListResponse(IReadOnlyList<CampusResponse> Items);

/// <summary>Campus row under a school.</summary>
public sealed record CampusResponse(long Id, long SchoolId, string Name, string? Address, bool IsActive);

/// <summary>Create or update campus request body.</summary>
public sealed record UpsertCampusRequest(string Name, string? Address, bool IsActive = true);

/// <summary>Paged student directory result.</summary>
public sealed record DirectoryStudentListResponse(
    IReadOnlyList<DirectoryStudentResponse> Items,
    int PageNumber,
    int PageSize,
    int TotalCount);

/// <summary>Approval decision recorded on a provisioned directory account.</summary>
public sealed record DirectoryApprovalHistoryItem(
    long ApproverUserId,
    string ApproverName,
    string ApproverRole,
    /// <summary>Pending | Approved | Rejected</summary>
    string Decision,
    DateTimeOffset? DecidedAt);

/// <summary>Student row in the school directory.</summary>
public sealed record DirectoryStudentResponse(
    long StudentId,
    string FullName,
    string Username,
    string RollNumber,
    short Grade,
    string Section,
    int SchoolId,
    int CampusId,
    bool IsActive,
    string? AvatarUrl,
    string SchoolName,
    string CampusName,
    IReadOnlyList<string> TeacherNames,
    string? MobileNumber,
    string? Cnic,
    string? EmailAddress,
    DateOnly? CreatedDate,
    DateTimeOffset? RequestedAt,
    DateTimeOffset? RejectedAt,
    DateTimeOffset? LastLoginAt,
    string? ReasonMessage,
    bool NeedsPasswordSetup,
    IReadOnlyList<DirectoryApprovalHistoryItem> ApprovalHistory,
    /// <summary>Active | ApprovedInactive | PendingApproval | Locked | Deactivated | Rejected</summary>
    string AccountStatus);

/// <summary>Provision a student from the directory UI.</summary>
public sealed record CreateDirectoryStudentRequest(
    string FullName,
    string Username,
    int SchoolId,
    int CampusId,
    string RollNumber,
    short Grade,
    string Section,
    string? MobileNumber = null,
    string? EmailAddress = null);

/// <summary>Update an existing student from the directory UI.</summary>
public sealed record UpdateDirectoryStudentRequest(
    string FullName,
    int CampusId,
    string RollNumber,
    short Grade,
    string Section,
    string? MobileNumber = null);

/// <summary>Paged teacher directory result.</summary>
public sealed record DirectoryTeacherListResponse(
    IReadOnlyList<DirectoryTeacherResponse> Items,
    int PageNumber,
    int PageSize,
    int TotalCount);

/// <summary>Teacher row in the school directory.</summary>
public sealed record DirectoryTeacherResponse(
    long TeacherId,
    string FullName,
    string Username,
    string TeacherCode,
    int SchoolId,
    int CampusId,
    bool IsActive,
    string? AvatarUrl,
    string SchoolName,
    string CampusName,
    int StudentCount,
    string? MobileNumber,
    string? Cnic,
    string? EmailAddress,
    DateOnly? CreatedDate,
    DateTimeOffset? RequestedAt,
    DateTimeOffset? RejectedAt,
    DateTimeOffset? LastLoginAt,
    string? ReasonMessage,
    bool NeedsPasswordSetup,
    IReadOnlyList<DirectoryApprovalHistoryItem> ApprovalHistory,
    /// <summary>Active | ApprovedInactive | PendingApproval | Locked | Deactivated | Rejected</summary>
    string AccountStatus,
    /// <summary>All roles on this account (e.g. Teacher, Parent).</summary>
    IReadOnlyList<string> Roles,
    /// <summary>Class (grade) + section combinations this teacher teaches.</summary>
    IReadOnlyList<TeacherClassSectionItem> ClassSections);

public sealed record CreateDirectoryTeacherRequest(
    string FullName,
    string Username,
    int SchoolId,
    int CampusId,
    string TeacherCode,
    string? MobileNumber = null,
    string? EmailAddress = null,
    /// <summary>Also assign Parent on the same account (Teacher + Parent + optional Coordinator).</summary>
    bool AlsoParent = false,
    /// <summary>Also assign Coordinator on the same account.</summary>
    bool AlsoCoordinator = false,
    /// <summary>Class/section pairs the teacher teaches (multiple allowed).</summary>
    IReadOnlyList<TeacherClassSectionItem>? ClassSections = null);

public sealed record UpdateDirectoryTeacherRequest(
    string FullName,
    int CampusId,
    string TeacherCode,
    string? MobileNumber = null,
    /// <summary>Ensure Parent is on this account (no-op if already present).</summary>
    bool AlsoParent = false,
    /// <summary>Ensure Coordinator is on this account (no-op if already present).</summary>
    bool AlsoCoordinator = false,
    /// <summary>Replaces the teacher's class/section assignments when provided.</summary>
    IReadOnlyList<TeacherClassSectionItem>? ClassSections = null);

/// <summary>Grant Teacher role to an existing Parent account.</summary>
public sealed record GrantTeacherRoleRequest(
    int SchoolId,
    int CampusId,
    string TeacherCode,
    string? MobileNumber = null);

/// <summary>Grant Coordinator role to an existing Parent (requires school/campus/code).</summary>
public sealed record GrantCoordinatorRoleRequest(
    int SchoolId,
    int CampusId,
    string CoordinatorCode,
    string? MobileNumber = null);

/// <summary>Grant Coordinator role to an existing Teacher (keeps teacher school/campus; code only).</summary>
public sealed record GrantTeacherCoordinatorRoleRequest(
    string CoordinatorCode,
    string? MobileNumber = null);

public sealed record DirectoryParentListResponse(
    IReadOnlyList<DirectoryParentResponse> Items,
    int PageNumber,
    int PageSize,
    int TotalCount);

/// <summary>Linked child summary on a directory parent row.</summary>
public sealed record DirectoryLinkedStudentSummary(long StudentId, string FullName, string Username);

public sealed record DirectoryParentResponse(
    long ParentId,
    string FullName,
    string Username,
    int LinkedStudentCount,
    IReadOnlyList<string> LinkedStudentNames,
    bool IsActive,
    string? AvatarUrl,
    string? MobileNumber,
    string? Cnic,
    string? EmailAddress,
    DateOnly? CreatedDate,
    DateTimeOffset? RequestedAt,
    DateTimeOffset? RejectedAt,
    DateTimeOffset? LastLoginAt,
    string? ReasonMessage,
    bool NeedsPasswordSetup,
    IReadOnlyList<DirectoryApprovalHistoryItem> ApprovalHistory,
    /// <summary>Active | ApprovedInactive | PendingApproval | Locked | Deactivated | Rejected</summary>
    string AccountStatus,
    /// <summary>All roles on this account (e.g. Parent, Teacher).</summary>
    IReadOnlyList<string> Roles,
    /// <summary>Active linked students (id + name) for link/unlink UI.</summary>
    IReadOnlyList<DirectoryLinkedStudentSummary> LinkedStudents);

public sealed record DirectoryTutorListResponse(
    IReadOnlyList<DirectoryTutorResponse> Items,
    int PageNumber,
    int PageSize,
    int TotalCount);

public sealed record DirectoryTutorResponse(
    long TutorId,
    string FullName,
    string Username,
    int LinkedStudentCount,
    IReadOnlyList<string> LinkedStudentNames,
    bool IsActive,
    string? AvatarUrl,
    string? MobileNumber,
    string? Cnic,
    string? EmailAddress,
    DateOnly? CreatedDate,
    DateTimeOffset? RequestedAt,
    DateTimeOffset? RejectedAt,
    DateTimeOffset? LastLoginAt,
    string? ReasonMessage,
    bool NeedsPasswordSetup,
    IReadOnlyList<DirectoryApprovalHistoryItem> ApprovalHistory,
    string AccountStatus,
    IReadOnlyList<string> Roles,
    IReadOnlyList<DirectoryLinkedStudentSummary> LinkedStudents);

public sealed record CreateDirectoryTutorRequest(
    string FullName,
    string Username,
    string? Cnic = null,
    string? MobileNumber = null,
    string? EmailAddress = null);

public sealed record CreateDirectoryParentRequest(
    string FullName,
    string Username,
    string? Cnic = null,
    string? MobileNumber = null,
    string? EmailAddress = null,
    /// <summary>Also assign Coordinator on the same account.</summary>
    bool AlsoCoordinator = false);

public sealed record UpdateDirectoryParentRequest(
    string FullName,
    string? Cnic = null,
    string? MobileNumber = null,
    /// <summary>Ensure Coordinator is on this account.</summary>
    bool AlsoCoordinator = false);

/// <summary>Result of granting Coordinator onto an existing Teacher/Parent account.</summary>
public sealed record GrantCoordinatorRoleResponse(
    long UserId,
    string FullName,
    string Username,
    IReadOnlyList<string> Roles);

/// <summary>Paged coordinator directory result.</summary>
public sealed record DirectoryCoordinatorListResponse(
    IReadOnlyList<DirectoryCoordinatorResponse> Items,
    int PageNumber,
    int PageSize,
    int TotalCount);

/// <summary>User holding the Coordinator role (often also Teacher and/or Parent).</summary>
public sealed record DirectoryCoordinatorResponse(
    long UserId,
    string FullName,
    string Username,
    string TeacherCode,
    int SchoolId,
    string SchoolName,
    int CampusId,
    string CampusName,
    bool IsActive,
    string? AvatarUrl,
    string? MobileNumber,
    string? Cnic,
    string? EmailAddress,
    DateOnly? CreatedDate,
    DateTimeOffset? RequestedAt,
    DateTimeOffset? RejectedAt,
    DateTimeOffset? LastLoginAt,
    string? ReasonMessage,
    bool NeedsPasswordSetup,
    string AccountStatus,
    IReadOnlyList<DirectoryApprovalHistoryItem> ApprovalHistory,
    IReadOnlyList<string> Roles,
    IReadOnlyList<CoordinatorClassSectionItem> ClassSections);

/// <summary>Create a Coordinator account (optionally also Teacher and/or Parent).</summary>
public sealed record CreateDirectoryCoordinatorRequest(
    string FullName,
    string Username,
    int SchoolId,
    int CampusId,
    string TeacherCode,
    string? MobileNumber = null,
    string? EmailAddress = null,
    /// <summary>Also assign Teacher on the same account (requires teacher code).</summary>
    bool AlsoTeacher = true,
    /// <summary>Also assign Parent on the same account.</summary>
    bool AlsoParent = false,
    IReadOnlyList<CoordinatorClassSectionItem>? ClassSections = null);

/// <summary>Update a Coordinator account and optional companion roles.</summary>
public sealed record UpdateDirectoryCoordinatorRequest(
    string FullName,
    int CampusId,
    /// <summary>When null or blank, the existing coordinator code is kept.</summary>
    string? TeacherCode = null,
    string? MobileNumber = null,
    /// <summary>Ensure Teacher is on this account.</summary>
    bool AlsoTeacher = false,
    /// <summary>Ensure Parent is on this account.</summary>
    bool AlsoParent = false,
    IReadOnlyList<CoordinatorClassSectionItem>? ClassSections = null);

public sealed record LinkParentStudentRequest(long StudentId, string Relationship = "Guardian");

public sealed record LinkParentStudentResponse(
    long ParentId,
    long StudentId,
    string Relationship,
    bool IsActive);

/// <summary>Bulk deactivate request listing entity ids.</summary>
public sealed record BulkDeactivateRequest(IReadOnlyList<long> Ids);

/// <summary>Count of entities affected by a bulk directory action.</summary>
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
    string? EmailAddress,
    bool IsActive,
    bool NeedsPasswordSetup,
    string? AvatarUrl,
    int ActiveCampusCount,
    int ActiveTeacherCount,
    int ActiveStudentCount,
    DateOnly? CreatedDate,
    DateTimeOffset? RequestedAt,
    DateTimeOffset? RejectedAt,
    DateTimeOffset? LastLoginAt,
    string? ReasonMessage,
    IReadOnlyList<DirectoryApprovalHistoryItem> ApprovalHistory,
    /// <summary>Active | ApprovedInactive | PendingApproval | Locked | Deactivated | Rejected</summary>
    string AccountStatus);

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
    string? EmailAddress,
    bool IsActive,
    bool NeedsPasswordSetup,
    string? AvatarUrl,
    int ActiveTeacherCount,
    int ActiveStudentCount,
    DateOnly? CreatedDate,
    DateTimeOffset? RequestedAt,
    DateTimeOffset? RejectedAt,
    DateTimeOffset? LastLoginAt,
    string? ReasonMessage,
    IReadOnlyList<DirectoryApprovalHistoryItem> ApprovalHistory,
    /// <summary>Active | ApprovedInactive | PendingApproval | Locked | Deactivated | Rejected</summary>
    string AccountStatus);

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
