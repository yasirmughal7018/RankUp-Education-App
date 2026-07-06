using RankUpEducation.Common.Utilities;

namespace RankUpEducation.Common.Validation;

public static class EmailInput
{
    public const int MaxLength = 150;

    /// <summary>Trim, lowercase, and validate shape. Returns false when empty or invalid.</summary>
    public static bool TryNormalizeValid(string? raw, out string normalized)
    {
        normalized = raw.AsNormalizedEmail();
        return normalized.Length > 0
            && normalized.Length <= MaxLength
            && EmailFormat.IsPlausibleEmail(normalized);
    }
}
