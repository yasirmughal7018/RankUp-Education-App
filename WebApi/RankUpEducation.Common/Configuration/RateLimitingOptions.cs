namespace RankUpEducation.Common.Configuration;

public sealed class RateLimitingOptions
{
    public const string SectionName = "RateLimiting";

    public int AuthPermitLimit { get; set; } = 30;
    public int AuthWindowSeconds { get; set; } = 60;

    public int LoginPermitLimit { get; set; } = 8;
    public int LoginWindowSeconds { get; set; } = 60;

    public int UsersAnonymousPermitLimit { get; set; } = 60;
    public int UsersAnonymousWindowSeconds { get; set; } = 60;

    public int ChangePasswordPermitLimit { get; set; } = 10;
    public int ChangePasswordWindowSeconds { get; set; } = 60;
}
