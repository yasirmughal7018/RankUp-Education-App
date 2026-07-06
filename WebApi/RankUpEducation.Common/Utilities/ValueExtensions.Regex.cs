using System.Text.RegularExpressions;

namespace RankUpEducation.Common.Utilities;

public static partial class ValueExtensions
{
    [GeneratedRegex(@"^[0-9]*(?:\.[0-9]*)?$", RegexOptions.CultureInvariant)]
    private static partial Regex NumericPattern();
}
