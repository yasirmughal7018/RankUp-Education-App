namespace RankUpEducation.Contracts.Auth;

public sealed record RegisterAccountRequest(
    string FullName,
    string MobileNumber,
    string? EmailAddress,
    string UserType,
    string? SchoolCampusName,
    string? StudentOrEmployeeId,
    string AdminTarget,
    string? ReasonMessage,
    int? SchoolId = null,
    int? CampusId = null,
    string? Cnic = null);

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
    DateTimeOffset? RequestedAt,
    string? MobileNumber,
    string? EmailAddress,
    string? Cnic,
    int? SchoolId,
    int? CampusId,
    DateOnly? CreatedDate,
    string? ReasonMessage,
    string? AdminTarget,
    string? SchoolCampusName,
    string? StudentOrEmployeeId);

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
