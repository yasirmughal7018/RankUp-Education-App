namespace RankUpEducation.Contracts.Teachers;

public sealed record TeacherClassSectionItem(short Grade, string Section);

public sealed record TeacherRosterStudentResponse(
    long StudentId,
    string FullName,
    string Username,
    string RollNumber,
    short Grade,
    string Section,
    bool IsActive = true,
    string AccountStatus = "Active");

public sealed record TeacherRosterListResponse(
    IReadOnlyList<TeacherClassSectionItem> ClassSections,
    IReadOnlyList<TeacherRosterStudentResponse> Students);

public sealed record TeacherGroupMemberResponse(
    long StudentId,
    string FullName,
    string Username,
    string RollNumber,
    short Grade,
    string Section);

public sealed record TeacherGroupResponse(
    long GroupId,
    string GroupName,
    string Description,
    bool IsActive,
    int MemberCount,
    IReadOnlyList<TeacherGroupMemberResponse> Members);

public sealed record TeacherGroupListResponse(IReadOnlyList<TeacherGroupResponse> Items);

public sealed record CreateTeacherGroupRequest(
    string GroupName,
    string? Description = null);

public sealed record UpdateTeacherGroupRequest(
    string GroupName,
    string? Description = null);

public sealed record AddTeacherGroupMemberRequest(long StudentId);

/// <summary>Teacher adds an existing student to a class/section they teach, by CNIC or username.</summary>
public sealed record AddMyStudentRequest(
    string Identifier,
    short Grade,
    string Section);

public sealed record AddMyStudentResponse(
    long StudentId,
    string FullName,
    string Username,
    string RollNumber,
    short Grade,
    string Section,
    bool AlreadyOnRoster);
