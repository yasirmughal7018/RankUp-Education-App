namespace RankUpEducation.Contracts.Auth;

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
    bool CurrentUserHasApproved);

public sealed record ApproveSchoolChangeResponse(
    long RequestId,
    long UserId,
    bool IsApplied,
    string Message);

public sealed record CurrentUserPendingSchoolChange(
    long Id,
    int? ToSchoolId,
    int? ToCampusId,
    string RequestedAt,
    string Status);
