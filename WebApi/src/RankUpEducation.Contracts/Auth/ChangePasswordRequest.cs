namespace RankUpEducation.Contracts.Auth;

public sealed record ChangePasswordRequest(
    string NewPassword,
    string? CurrentPassword = null);
