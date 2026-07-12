namespace RankUpEducation.Contracts.Auth;

public sealed record RegisterAccountRequest(
    string FullName,
    string MobileNumber,
    string? EmailAddress,
    string UserType,
    string? RollNumberTeacherCode,
    string? ReasonMessage,
    int? SchoolId = null,
    int? CampusId = null,
    string? Cnic = null);

public sealed record RegisterAccountResponse(
    long Id,
    string Username,
    string FullName,
    string Role);

public sealed record PendingApproverResponse(
    long UserId,
    string FullName,
    string Username,
    string Role);

public sealed record PendingRegistrationResponse(
    long Id,
    string Username,
    string FullName,
    string Role,
    DateTimeOffset? RequestedAt,
    string? MobileNumber,
    string? EmailAddress,
    string? Cnic,
    int? SchoolId,
    int? CampusId,
    DateOnly? CreatedDate,
    string? ReasonMessage,
    string? RollNumberTeacherCode,
    IReadOnlyList<PendingApproverResponse> PendingApprovers);

/// <summary>Approve uses registration details as submitted. No password or field edits.</summary>
public sealed record ApproveRegistrationRequest();
