namespace RankUpEducation.Contracts.Auth;

/// <summary>Target role when switching an authenticated multi-role session.</summary>
public sealed record SwitchRoleRequest(string Role);
