namespace RankUpEducation.Contracts.Auth;

/// <summary>Token pair returned from refresh (no full user profile).</summary>
public sealed record AuthTokensResponse(
    string AccessToken,
    string RefreshToken);
