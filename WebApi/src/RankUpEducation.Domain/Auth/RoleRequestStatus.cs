namespace RankUpEducation.Domain.Auth;

/// <summary>Lifecycle of a self-service additional-role request.</summary>
public enum RoleRequestStatus : short
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
}
