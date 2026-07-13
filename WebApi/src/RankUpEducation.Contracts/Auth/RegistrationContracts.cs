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
    IReadOnlyList<PendingApproverResponse> PendingApprovers,
    /// <summary>True when the current admin already recorded approval and is waiting on Portal Admin.</summary>
    bool CurrentUserHasApproved);

/// <summary>Approve uses registration details as submitted. No password or field edits.</summary>
public sealed record ApproveRegistrationRequest();

public sealed record ApproveRegistrationResponse(
    long UserId,
    string Username,
    string FullName,
    /// <summary>True when Portal Admin approved and the account is ready for set-initial-password.</summary>
    bool IsActivated,
    string Message);
