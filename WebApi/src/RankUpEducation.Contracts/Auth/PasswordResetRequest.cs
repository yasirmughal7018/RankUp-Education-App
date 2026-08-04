namespace RankUpEducation.Contracts.Auth;

/// <summary>Username (email) for forgot-password request.</summary>
public sealed record PasswordResetRequest(string Username);

/// <summary>Complete a password reset using the emailed token.</summary>
public sealed record CompletePasswordResetRequest(
    string Token,
    string NewPassword);
