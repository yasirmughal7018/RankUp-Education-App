namespace RankUpEducation.Contracts.Auth;

public sealed record CurrentUserResponse(
    long Id,
    string Username,
    string FullName,
    string Name,
    string Role,
    long? ProfileId,
    int? SchoolId,
    int? CampusId,
    IReadOnlyList<string> Permissions,
    bool MustChangePassword);
