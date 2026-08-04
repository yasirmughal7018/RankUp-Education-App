namespace RankUpEducation.Contracts.Auth;

/// <summary>Self-service request to transfer to another school and/or campus.</summary>
public sealed record RequestSchoolChangeRequest(
    int? SchoolId,
    int? CampusId);

/// <summary>Outcome of a school-change request (role and/or account locked while pending).</summary>
public sealed record RequestSchoolChangeResponse(
    long RequestId,
    bool IsLocked,
    string Message,
    /// <summary>True when the account was fully deactivated (single-role case).</summary>
    bool IsAccountFullyLocked = true,
    /// <summary>Role locked by this request (e.g. Teacher).</summary>
    string? LockedRole = null,
    /// <summary>When role-scoped lock: new access token for a remaining unlocked role.</summary>
    string? AccessToken = null,
    /// <summary>When role-scoped lock: new refresh token for a remaining unlocked role.</summary>
    string? RefreshToken = null,
    /// <summary>When role-scoped lock: session profile for the continued role.</summary>
    CurrentUserResponse? User = null);
