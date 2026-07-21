namespace RankUpEducation.Contracts.Auth;

/// <summary>Signed-in user session profile returned by login and profile endpoints.</summary>
public sealed record CurrentUserResponse(
    long Id,
    string Username,
    string FullName,
    string Name,
    string Role,
    IReadOnlyList<string> Roles,
    long? ProfileId,
    int? SchoolId,
    int? CampusId,
    string? EmailAddress,
    string? MobileNumber,
    string? Cnic,
    string? AvatarUrl,
    CurrentUserPendingSchoolChange? PendingSchoolChange,
    IReadOnlyList<string> Permissions,
    bool? MustChangePassword);

