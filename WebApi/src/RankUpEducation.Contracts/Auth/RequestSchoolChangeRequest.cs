namespace RankUpEducation.Contracts.Auth;

/// <summary>Self-service request to transfer to another school and/or campus.</summary>
public sealed record RequestSchoolChangeRequest(
    int? SchoolId,
    int? CampusId);

/// <summary>Outcome of a school-change request (account locked while pending).</summary>
public sealed record RequestSchoolChangeResponse(
    long RequestId,
    bool IsLocked,
    string Message);
