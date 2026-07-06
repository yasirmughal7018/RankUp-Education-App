using System.Text.RegularExpressions;

namespace RankUpEducation.Common.Validation;

/// <summary>Lightweight email shape checks shared by application and infrastructure layers.</summary>
public static partial class EmailFormat
{
    /// <summary>Returns true if <paramref name="email"/> matches a simple local@domain.tld pattern.</summary>
    public static bool IsPlausibleEmail(string email) =>
        PlausibleEmailRegex().IsMatch(email);

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.CultureInvariant)]
    private static partial Regex PlausibleEmailRegex();
}
