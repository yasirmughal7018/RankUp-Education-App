namespace RankUpEducation.Common.Configuration;

/// <summary>ASP.NET Core probe endpoints (distinct from business health settings).</summary>
public sealed class HealthCheckEndpointOptions
{
    public const string SectionName = "HealthChecks";

    public bool Enabled { get; set; } = true;

    public string LivePath { get; set; } = "/health/live";

    public string ReadyPath { get; set; } = "/health/ready";

    public string DetailedPath { get; set; } = "/health";
}
