namespace RankUpEducation.Common.Configuration;

public sealed class CorsOptions
{
    public const string SectionName = "Cors";
    public const string PolicyName = "RankUpEducation";

    public string[] AllowedOrigins { get; set; } = [];
}
