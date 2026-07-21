namespace RankUpEducation.Contracts.Auth;

/// <summary>Self-service profile update. School/campus changes use the school-change endpoint.</summary>
public sealed record UpdateProfileRequest(
    string FullName,
    string MobileNumber,
    string? EmailAddress = null,
    string? Cnic = null,
    int? SchoolId = null,
    int? CampusId = null);
