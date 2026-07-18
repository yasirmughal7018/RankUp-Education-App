namespace RankUpEducation.Contracts.Auth;

public sealed record RequestSchoolChangeRequest(
    int? SchoolId,
    int? CampusId);

public sealed record RequestSchoolChangeResponse(
    long RequestId,
    bool IsLocked,
    string Message);
