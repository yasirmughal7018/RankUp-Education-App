namespace RankUpEducation.Contracts.Auth;

/// <summary>Self-service request to add Parent or Teacher as an additional role.</summary>
public sealed record RequestAdditionalRoleRequest(
    string Role,
    int? SchoolId = null,
    int? CampusId = null,
    string? TeacherCode = null,
    string? ReasonMessage = null);

/// <summary>Acknowledgement after queuing an additional-role request.</summary>
public sealed record RequestAdditionalRoleResponse(
    long Id,
    string RequestedRole,
    string Message);

/// <summary>Pending additional-role request for the signed-in user.</summary>
public sealed record CurrentUserPendingRoleRequest(
    long Id,
    string RequestedRole,
    int? SchoolId,
    int? CampusId,
    string? TeacherCode,
    string? ReasonMessage,
    string RequestedAt);

/// <summary>Admin view of a pending additional-role request.</summary>
public sealed record PendingRoleRequestResponse(
    long Id,
    long UserId,
    string FullName,
    string Username,
    string ActiveRole,
    IReadOnlyList<string> ExistingRoles,
    string RequestedRole,
    int? SchoolId,
    int? CampusId,
    string? TeacherCode,
    string? ReasonMessage,
    string RequestedAt);

/// <summary>Reject an additional-role request.</summary>
public sealed record RejectRoleRequestRequest(string Reason);
