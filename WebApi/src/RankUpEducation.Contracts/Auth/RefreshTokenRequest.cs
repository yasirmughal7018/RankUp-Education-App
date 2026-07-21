namespace RankUpEducation.Contracts.Auth;

/// <summary>Refresh token submitted for rotation or logout.</summary>
public sealed record RefreshTokenRequest(string RefreshToken);
