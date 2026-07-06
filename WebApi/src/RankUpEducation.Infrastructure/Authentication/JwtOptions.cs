namespace RankUpEducation.Infrastructure.Authentication;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; init; } = "RankUpEducation";
    public string Audience { get; init; } = "RankUpEducation.Clients";
    public string SigningKey { get; init; } = "CHANGE_ME_TO_A_SECURE_32_CHARACTER_MINIMUM_SECRET";
    public int AccessTokenMinutes { get; init; } = 30;
}
