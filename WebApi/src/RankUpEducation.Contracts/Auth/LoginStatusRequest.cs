namespace RankUpEducation.Contracts.Auth;

/// <summary>CNIC or mobile number for pre-login account status check.</summary>
public sealed record LoginStatusRequest(string Username);
