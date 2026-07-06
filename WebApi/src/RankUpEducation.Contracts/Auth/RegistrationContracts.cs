namespace RankUpEducation.Contracts.Auth;

public sealed record RegisterAccountRequest(
    string FullName,
    string MobileNumber,
    string? EmailAddress,
    string UserType,
    string? SchoolCampusName,
    string? StudentOrEmployeeId,
    string AdminTarget,
    string? ReasonMessage);

public sealed record RegisterAccountResponse(
    long Id,
    string Username,
    string FullName,
    string Role);

public sealed record PendingRegistrationResponse(
    long Id,
    string Username,
    string FullName,
    string Role,
    DateTimeOffset? RequestedAt);

public sealed record ApproveRegistrationRequest(
    string Password,
    int? SchoolId,
    int? CampusId,
    string? StudentRollNumber,
    short? Grade,
    string? Section,
    string? TeacherCode,
    string? MobileNumber,
    string? Cnic);
