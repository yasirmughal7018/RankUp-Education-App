namespace RankUpEducation.Contracts.Auth;

/// <summary>Confirms identity before self-deactivation.</summary>
public sealed record DeactivateAccountRequest(string CurrentPassword);
