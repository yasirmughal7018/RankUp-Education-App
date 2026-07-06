using RankUpEducation.Common.Utilities;

namespace RankUpEducation.Common.Configuration;

public static class HealthCheckEndpointRules
{
    public static string NormalizePath(string? path, string fallback)
    {
        var trimmed = path.AsTrimmedString();
        if (trimmed.Length == 0)
        {
            return fallback;
        }

        return trimmed.StartsWith('/') ? trimmed : "/" + trimmed;
    }
}
