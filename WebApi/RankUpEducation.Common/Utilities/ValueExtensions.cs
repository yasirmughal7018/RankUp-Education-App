using Quartz;
using Quartz.Util;
using System.Globalization;
using System.Text;

namespace RankUpEducation.Common.Utilities;

/// <summary>
/// Parsing and formatting helpers for untyped values (forms, legacy ADO, config strings).
/// Empty checks use <see cref="AsTrimmedString"/> then length — fast and treats whitespace as empty.
/// </summary>
public static partial class ValueExtensions
{
    private static readonly CultureInfo Invariant = CultureInfo.InvariantCulture;

    private const string CompactDateTimeFormat = "yyyyMMddHHmmss";
    private const string CompactDateFormat = "yyyyMMdd";
    public const string IsoDateFormat = "yyyy-MM-dd";

    private const NumberStyles IntegerStyles = NumberStyles.Integer;
    private const NumberStyles DecimalStyles = NumberStyles.Number;

    #region Text

    /// <summary>Null, empty, or whitespace-only → <see cref="string.Empty"/>; otherwise trimmed text.</summary>
    public static string AsTrimmedString(this object? value) =>
        value switch
        {
            null => string.Empty,
            string s => s.AsTrimmedString(),
            _ => (value.ToString() ?? string.Empty).AsTrimmedString(),
        };

    /// <summary>Null, empty, or whitespace-only → <see cref="string.Empty"/>; otherwise trimmed text.</summary>
    public static string AsTrimmedString(this string? value)
    {
        if (string.IsNullOrEmpty(value))
            return string.Empty;

        var trimmed = value.Trim();
        return trimmed.Length == 0 ? string.Empty : trimmed;
    }

    /// <summary>Null, empty, or whitespace-only → <c>null</c>; otherwise trimmed text.</summary>
    public static string? AsTrimmedOrNull(this object? value)
    {
        var trimmed = value.AsTrimmedString();
        return trimmed.Length == 0 ? null : trimmed;
    }

    /// <summary>Null, empty, or whitespace-only → <c>null</c>; otherwise trimmed text.</summary>
    public static string? AsTrimmedOrNull(this string? value)
    {
        var trimmed = value.AsTrimmedString();
        return trimmed.Length == 0 ? null : trimmed;
    }

    /// <summary>Blank → <paramref name="defaultValue"/>; otherwise trimmed text.</summary>
    public static string AsTrimmedOrDefault(this string? value, string defaultValue)
    {
        var trimmed = value.AsTrimmedString();
        return trimmed.Length == 0 ? defaultValue : trimmed;
    }

    /// <summary>Blank → <c>null</c>; otherwise trimmed lowercase email.</summary>
    public static string? AsNormalizedEmailOrNull(this string? email)
    {
        var normalized = email.AsNormalizedEmail();
        return normalized.Length == 0 ? null : normalized;
    }

    public static string EmptyIfZero(this object? value)
    {
        var text = value.AsTrimmedString();
        return text == "0" ? string.Empty : text;
    }

    public static string JoinNonEmptyParts(
        this object? value,
        char separator = ',',
        string joinWith = ",")
    {
        var text = value.AsTrimmedString();
        if (text.Length == 0)
            return string.Empty;

        return string.Join(
            joinWith,
            text.Split(separator, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
    }

    public static bool HasTrimmedText(this object? value) =>
        value.AsTrimmedString().Length > 0;

    public static bool HasTrimmedText(this string? value) =>
        value.AsTrimmedString().Length > 0;

    /// <summary>Trim + lowercase — standard shape for stored/compared emails.</summary>
    public static string AsNormalizedEmail(this string? email) =>
        email.AsLowercase();

    public static string AsLowercase(this object? value) =>
        value.AsTrimmedString().ToLowerInvariant();

    public static string AsLowercase(this string? value) =>
    value.AsTrimmedString().ToLowerInvariant();

    public static string AsUppercase(this object? value) =>
        value.AsTrimmedString().ToUpperInvariant();

    public static string AsUppercase(this string? value) =>
    value.AsTrimmedString().ToUpperInvariant();

    public static string AsTitleCase(this object? value) =>
        Invariant.TextInfo.ToTitleCase(value.AsLowercase());

    public static string AsTitleCase(this string? value) =>
    Invariant.TextInfo.ToTitleCase(value.AsLowercase());

    public static string AsLowercaseWithoutSpaces(this object? value) =>
        value.AsLowercase().Replace(" ", string.Empty, StringComparison.Ordinal);

    public static string WithoutLineBreaks(this object? value)
    {
        var text = value.AsTrimmedString();
        if (text.Length == 0)
            return string.Empty;

        return string.Concat(text.Where(static c => c is not ('\r' or '\n' or '\t')));
    }

    public static string WithoutNumberGroupSeparator(this string? value, CultureInfo culture)
    {
        var text = value.AsTrimmedString();
        if (text.Length == 0)
            return string.Empty;

        return text.Replace(culture.NumberFormat.NumberGroupSeparator, string.Empty, StringComparison.Ordinal);
    }

    #endregion

    #region Numbers

    public static int ToInt32OrDefault(this object? value) =>
        TryParseInt32(value, out var n) ? n : 0;

    public static int? ToNullableInt32(this object? value) =>
        TryParseInt32(value, out var n) ? n : null;

    public static short ToInt16OrDefault(this object? value) =>
        TryParseInt16(value, out var n) ? n : (short)0;

    public static long ToInt64OrDefault(this object? value) =>
        TryParseInt64(value, out var n) ? n : 0L;

    public static long ToInt64FromDecimal(this object? value) =>
        (long)value.ToDecimalOrDefault();

    public static decimal ToDecimalOrDefault(this object? value) =>
        TryParseDecimal(value, Invariant, out var n) ? n : 0m;

    public static decimal ToDecimalOrDefault(this object? value, CultureInfo culture) =>
        TryParseDecimal(value, culture, out var n) ? n : 0m;

    public static decimal ToWholeNumber(this object? value) =>
        Math.Round(value.ToDecimalOrDefault(), 0, MidpointRounding.AwayFromZero);

    public static decimal AsCompactDateTimeNumber(this DateTime dateTime) =>
        decimal.Parse(
            dateTime.ToString(CompactDateTimeFormat, Invariant),
            DecimalStyles,
            Invariant);

    #endregion

    #region Boolean

    public static string ToBooleanDisplayString(
        this object? value,
        BooleanDisplayFormat format = BooleanDisplayFormat.TrueFalse) =>
        FormatBooleanDisplay(ClassifyBoolean(value.AsTrimmedString()), format);

    /// <summary>Empty or unrecognized → <c>false</c>.</summary>
    public static bool ToBooleanOrDefault(this object? value) =>
        ClassifyBoolean(value.AsTrimmedString()) == BooleanInput.True;

    /// <summary>Empty, <c>2</c> (unknown), or unrecognized → <c>null</c>.</summary>
    public static bool? ToNullableBoolean(this object? value) =>
        ClassifyBoolean(value.AsTrimmedString()) switch
        {
            BooleanInput.False => false,
            BooleanInput.True => true,
            _ => null,
        };

    public static string ToOneZeroString(this bool value) => value ? "1" : "0";

    public static string ToTriStateOneZeroString(this bool? value) =>
        value.HasValue ? value.Value.ToOneZeroString() : "2";

    #endregion

    #region Date and time

    public static DateTime ParseCompactDateTime(this decimal compactValue, IFormatProvider provider) =>
        DateTime.ParseExact(compactValue.ToString(provider), CompactDateTimeFormat, provider);

    public static DateTime ParseCompactDate(this string compactValue, IFormatProvider provider) =>
        DateTime.ParseExact(compactValue.ToString(provider), CompactDateFormat, provider);

    public static DateTime? ToNullableDateTime(this object? value, string? format = null)
    {
        var text = value.AsTrimmedString();
        if (text.Length == 0)
            return null;

        if (string.IsNullOrEmpty(format))
        {
            return DateTime.TryParse(text, Invariant, DateTimeStyles.None, out var parsed)
                ? parsed
                : null;
        }

        return DateTime.TryParseExact(text, format, Invariant, DateTimeStyles.None, out var exact)
            ? exact
            : null;
    }

    public static string FormatDateTime(this object? value, string format = CompactDateFormat)
    {
        if (value is DateTime dateTime)
            return dateTime.ToString(format, Invariant);

        var text = value.AsTrimmedString();
        if (text.Length == 0)
            return string.Empty;

        return DateTime.ParseExact(text, format, Invariant)
                       .ToString(format, Invariant);
    }

    /// <summary>UTC calendar date as ISO <c>yyyy-MM-dd</c> (invariant).</summary>
    public static string ToIsoDateString(this DateTime dateTime) =>
        dateTime.FormatDateTime(IsoDateFormat);

    public static DateTime TodayUtc() => DateTime.UtcNow.Date;

    public static DateTime ToUtcDate(this DateTime recordedAt)
    {
        var utc = recordedAt.Kind switch
        {
            DateTimeKind.Utc => recordedAt,
            DateTimeKind.Local => recordedAt.ToUniversalTime(),
            _ => DateTime.SpecifyKind(recordedAt, DateTimeKind.Utc),
        };

        return utc.Date;
    }

    #endregion

    #region Database

    public static object ToDatabaseValue(this object? value)
    {
        var text = value.AsTrimmedString();
        return text.Length == 0 ? DBNull.Value : text;
    }

    #endregion

    #region Validation

    public static bool IsDigitsOnlyOrEmpty(this string? value)
    {
        var text = value.AsTrimmedString();
        return text.Length == 0 || text.All(char.IsDigit);
    }

    public static bool IsNumericOrEmpty(this string? value)
    {
        var text = value.AsTrimmedString();
        return text.Length == 0 || NumericPattern().IsMatch(text);
    }

    public static bool IsValidDateRange(this DateTime from, DateTime to) =>
        from.Date < to.Date;

    #endregion

    #region Identifiers

    public static string ToHexString(this byte[]? bytes) =>
        bytes is null or { Length: 0 } ? string.Empty : Convert.ToHexString(bytes);

    public static string AsGuidWithoutDashes(this Guid id) =>
        id.ToString("N").ToUpperInvariant();

    public static string NewGuidWithoutDashes() =>
        Guid.NewGuid().AsGuidWithoutDashes();

    #endregion

    #region Cron (Quartz)

    public static DateTime GetNextCronRunTime(this string cronExpression)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(cronExpression);

        var now = DateTimeOffset.Now;
        var next = new CronExpression(cronExpression).GetNextValidTimeAfter(now)
            ?? throw new InvalidOperationException($"No next run time for: {cronExpression}");

        return next.DateTime.Add(now.Offset);
    }

    public static DateTime GetNextCronRunTimeAfterUtc(this string cronExpression, DateTime afterUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(cronExpression);

        var after = afterUtc.Kind switch
        {
            DateTimeKind.Utc => new DateTimeOffset(afterUtc, TimeSpan.Zero),
            DateTimeKind.Local => new DateTimeOffset(afterUtc.ToUniversalTime(), TimeSpan.Zero),
            _ => new DateTimeOffset(DateTime.SpecifyKind(afterUtc, DateTimeKind.Utc), TimeSpan.Zero),
        };

        var next = new CronExpression(cronExpression).GetNextValidTimeAfter(after)
            ?? throw new InvalidOperationException($"No next run time for: {cronExpression}");

        return next.UtcDateTime;
    }

    public static string DescribeCronExpression(this string cronExpression)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(cronExpression);

        var parts = cronExpression.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 6)
            throw new ArgumentException("Cron expression must have at least 6 fields.", nameof(cronExpression));

        var description = new StringBuilder("At ");
        AppendCronMinutes(description, parts[1]);
        AppendCronHours(description, parts[2]);
        AppendCronDayOfMonth(description, parts[3]);
        AppendCronMonth(description, parts[4]);
        AppendCronDayOfWeek(description, parts[5]);
        return description.ToString();
    }

    #endregion

    #region Idempotency Check

    /// <summary>
    /// Idempotency-Key header is required (max 200 characters).
    /// throw new InvalidStepDataException("Idempotency-Key header is required (max 200 characters).");
    /// </summary>
    /// <param name="key"></param>
    /// <returns>bool</returns>
    public static bool IsValidIdempotencyKey(this string? key) => (!string.IsNullOrWhiteSpace(key) && key.Length <= 200);

    #endregion

    #region Private helpers

    private enum BooleanInput
    {
        Empty,
        False,
        True,
        Intermediate,
        Unrecognized,
    }

    private static bool TryGetText(object? value, out string text)
    {
        text = value.AsTrimmedString();
        return text.Length > 0;
    }

    private static bool TryParseInt32(object? value, out int number)
    {
        number = 0;
        return TryGetText(value, out var text)
            && int.TryParse(text, IntegerStyles, Invariant, out number);
    }

    private static bool TryParseInt16(object? value, out short number)
    {
        number = 0;
        return TryGetText(value, out var text)
            && short.TryParse(text, IntegerStyles, Invariant, out number);
    }

    private static bool TryParseInt64(object? value, out long number)
    {
        number = 0;
        return TryGetText(value, out var text)
            && long.TryParse(text, IntegerStyles, Invariant, out number);
    }

    private static bool TryParseDecimal(object? value, CultureInfo culture, out decimal number)
    {
        number = 0;
        return TryGetText(value, out var text)
            && decimal.TryParse(text, DecimalStyles, culture, out number);
    }

    private static BooleanInput ClassifyBoolean(string text)
    {
        if (text.Length == 0)
            return BooleanInput.Empty;

        return text.ToLowerInvariant() switch
        {
            "0" or "false" or "no" => BooleanInput.False,
            "1" or "true" or "yes" => BooleanInput.True,
            "2" => BooleanInput.Intermediate,
            _ => BooleanInput.Unrecognized,
        };
    }

    private static string FormatBooleanDisplay(BooleanInput input, BooleanDisplayFormat format) =>
        input switch
        {
            BooleanInput.False => format switch
            {
                BooleanDisplayFormat.TrueFalse => "False",
                BooleanDisplayFormat.YesNo => "No",
                BooleanDisplayFormat.ZeroOne => "0",
                _ => string.Empty,
            },
            BooleanInput.True => format switch
            {
                BooleanDisplayFormat.TrueFalse => "True",
                BooleanDisplayFormat.YesNo => "Yes",
                BooleanDisplayFormat.ZeroOne => "1",
                _ => string.Empty,
            },
            _ => string.Empty,
        };

    private static void AppendCronMinutes(StringBuilder description, string minutes)
    {
        if (minutes == "*")
            description.Append("every minute");
        else if (minutes.Contains('/', StringComparison.Ordinal))
            description.Append($"every {minutes[(minutes.IndexOf('/') + 1)..]} minutes");
        else
            description.Append($"{minutes} minutes past the hour");
    }

    private static void AppendCronHours(StringBuilder description, string hours) =>
        description.Append(hours == "*" ? ", every hour" : $" at {hours}");

    private static void AppendCronDayOfMonth(StringBuilder description, string dayOfMonth)
    {
        if (dayOfMonth == "?")
            return;

        description.Append(dayOfMonth == "*" ? ", every day" : $", on day {dayOfMonth}");
    }

    private static void AppendCronMonth(StringBuilder description, string month) =>
        description.Append(month == "*" ? " of every month" : $" in {month}");

    private static void AppendCronDayOfWeek(StringBuilder description, string dayOfWeek)
    {
        if (dayOfWeek == "?")
            return;

        description.Append(dayOfWeek == "*" ? ", every day of the week" : $", on {dayOfWeek}");
    }

    #endregion
}

public enum BooleanDisplayFormat
{
    YesNo,
    TrueFalse,
    ZeroOne,
}
