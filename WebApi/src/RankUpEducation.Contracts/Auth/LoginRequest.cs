namespace RankUpEducation.Contracts.Auth;

/// <summary>Credentials for password login (username is CNIC or mobile number).</summary>
public sealed record LoginRequest(
    string Username,
    string? Password = null);
