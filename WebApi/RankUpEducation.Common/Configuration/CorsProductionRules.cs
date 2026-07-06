using RankUpEducation.Common.Utilities;

namespace RankUpEducation.Common.Configuration;

public static class CorsProductionRules
{
    public static string[] NormalizeOrigins(IEnumerable<string>? origins) =>
        origins?
            .Where(static origin => origin.AsTrimmedString().Length > 0)
            .Select(static origin => origin.AsTrimmedString().TrimEnd('/'))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray()
        ?? [];

    public static IReadOnlyList<string> ValidateProduction(IReadOnlyList<string> normalizedOrigins)
    {
        var errors = new List<string>(normalizedOrigins.Count + 1);

        if (normalizedOrigins.Count == 0)
        {
            errors.Add(
                "Cors:AllowedOrigins must contain at least one origin in production " +
                "(use environment variables or user secrets).");
            return errors;
        }

        foreach (var origin in normalizedOrigins)
        {
            ValidateOrigin(origin, requireHttps: true, errors);
        }

        return errors;
    }

    public static IReadOnlyList<string> ValidateConfiguredOrigins(IReadOnlyList<string> normalizedOrigins)
    {
        var errors = new List<string>(normalizedOrigins.Count);

        foreach (var origin in normalizedOrigins)
        {
            ValidateOrigin(origin, requireHttps: false, errors);
        }

        return errors;
    }

    private static void ValidateOrigin(string origin, bool requireHttps, List<string> errors)
    {
        if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
        {
            errors.Add($"Cors:AllowedOrigins contains invalid URL '{origin}'.");
            return;
        }

        if (requireHttps
            && !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            errors.Add($"Cors origin '{origin}' must use https in production.");
        }

        if (requireHttps && IsLocalHost(uri.Host))
        {
            errors.Add($"Cors origin '{origin}' must not point to localhost in production.");
        }
    }

    private static bool IsLocalHost(string host) =>
        host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
        || host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase)
        || host.EndsWith(".local", StringComparison.OrdinalIgnoreCase);
}
