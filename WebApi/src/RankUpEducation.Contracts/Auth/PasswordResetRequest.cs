namespace RankUpEducation.Contracts.Auth;

/// <summary>CNIC or mobile number for forgot-password or admin clear flows.</summary>
public sealed record PasswordResetRequest(string Username);
