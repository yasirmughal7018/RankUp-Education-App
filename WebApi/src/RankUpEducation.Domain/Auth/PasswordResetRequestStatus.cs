namespace RankUpEducation.Domain.Auth;

/// <summary>Lifecycle of a forgot-password request.</summary>
public enum PasswordResetRequestStatus : short
{
    Pending = 0,
    Completed = 1,
    Cancelled = 2,
}
