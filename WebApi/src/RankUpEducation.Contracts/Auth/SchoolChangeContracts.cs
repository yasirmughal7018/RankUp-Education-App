namespace RankUpEducation.Contracts.Auth;

/// <summary>Pending school/campus transfer visible to an admin reviewer.</summary>
public sealed record PendingSchoolChangeResponse(
    long Id,
    long UserId,
    string FullName,
    string Username,
    string RequesterRole,
    int? FromSchoolId,
    int? FromCampusId,
    int? ToSchoolId,
    int? ToCampusId,
    string RequestedAt,
    IReadOnlyList<PendingApproverResponse> Approvers,
    bool CurrentUserHasApproved,
    bool SchoolAdminHasApproved);

/// <summary>Result of approving a school-change (application may still be pending).</summary>
public sealed record ApproveSchoolChangeResponse(
    long RequestId,
    long UserId,
    bool IsApplied,
    string Message);

/// <summary>Embedded in current-user when the account is locked for a pending transfer.</summary>
public sealed record CurrentUserPendingSchoolChange(
    long Id,
    int? ToSchoolId,
    int? ToCampusId,
    string RequestedAt,
    string Status);
