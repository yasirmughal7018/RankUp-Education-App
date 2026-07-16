namespace RankUpEducation.Contracts.Auth;

public sealed record UpdateProfileRequest(
    string FullName,
    string MobileNumber,
    string? EmailAddress = null,
    string? Cnic = null,
    int? SchoolId = null,
    int? CampusId = null);
