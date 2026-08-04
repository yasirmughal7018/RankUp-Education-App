namespace RankUpEducation.Contracts.Auth;

/// <summary>Password change while authenticated. Current password omitted when completing first-time setup.</summary>
public sealed record ChangePasswordRequest(
    string NewPassword,
    string? CurrentPassword = null);
