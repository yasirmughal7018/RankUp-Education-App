using RankUpEducation.Contracts.Questions;
using ClosedXML.Excel;

namespace RankUpEducation.Application.Questions;

/// <summary>Parses Web Excel (.xlsx) question import templates into import draft rows.</summary>
public static class QuestionExcelImportParser
{
    public static IReadOnlyList<QuestionExcelImportRow> Parse(Stream stream)
    {
        using var workbook = new XLWorkbook(stream);
        var worksheet = workbook.Worksheets.First();
        var range = worksheet.RangeUsed();
        if (range is null)
        {
            return Array.Empty<QuestionExcelImportRow>();
        }

        var headerRow = range.FirstRow();
        var headers = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var cell in headerRow.CellsUsed())
        {
            var name = cell.GetString().Trim();
            if (name.Length > 0)
            {
                headers[name] = cell.Address.ColumnNumber;
            }
        }

        RequireHeader(headers, "QuestionText");
        RequireHeader(headers, "QuestionType");
        RequireAnyHeader(headers, "Class", "ClassId");
        RequireAnyHeader(headers, "Subject", "SubjectId");
        RequireHeader(headers, "DifficultyLevel");
        RequireHeader(headers, "Marks");

        var rows = new List<QuestionExcelImportRow>();
        foreach (var row in range.RowsUsed().Skip(1))
        {
            var questionText = GetString(row, headers, "QuestionText");
            if (string.IsNullOrWhiteSpace(questionText))
            {
                continue;
            }

            var correctOptionIndex = GetNullableShort(row, headers, "CorrectOption");
            var options = new List<QuestionOptionRequest>();
            for (var optionIndex = 1; optionIndex <= 8; optionIndex++)
            {
                var optionKey = $"Option{optionIndex}";
                var correctKey = $"IsCorrect{optionIndex}";
                if (!headers.ContainsKey(optionKey))
                {
                    continue;
                }

                var optionText = GetString(row, headers, optionKey);
                if (string.IsNullOrWhiteSpace(optionText))
                {
                    continue;
                }

                var markedByFlag = GetBool(row, headers, correctKey, defaultValue: false);
                var markedByIndex = correctOptionIndex is short index && index == optionIndex;
                options.Add(new QuestionOptionRequest(optionText, markedByFlag || markedByIndex));
            }

            var acceptedAnswers = new List<QuestionAcceptedAnswerRequest>();
            for (var answerIndex = 1; answerIndex <= 8; answerIndex++)
            {
                var answerKey = $"AcceptedAnswer{answerIndex}";
                if (!headers.ContainsKey(answerKey))
                {
                    continue;
                }

                var answerText = GetString(row, headers, answerKey);
                if (string.IsNullOrWhiteSpace(answerText))
                {
                    continue;
                }

                acceptedAnswers.Add(new QuestionAcceptedAnswerRequest(
                    AnswerText: answerText,
                    IsCaseSensitive: GetBool(row, headers, $"IsCaseSensitive{answerIndex}", defaultValue: false),
                    AllowPartialMatch: GetBool(row, headers, $"AllowPartialMatch{answerIndex}", defaultValue: false),
                    MinimumLength: GetShort(row, headers, $"MinLength{answerIndex}", defaultValue: 0),
                    MaximumLength: GetShort(row, headers, $"MaxLength{answerIndex}", defaultValue: 1000),
                    AllowAiReview: GetBool(row, headers, $"AllowAIReview{answerIndex}", defaultValue: false),
                    AllowTeacherReview: GetBool(row, headers, $"AllowTeacherReview{answerIndex}", defaultValue: false)));
            }

            rows.Add(new QuestionExcelImportRow(
                QuestionText: questionText,
                QuestionType: GetString(row, headers, "QuestionType"),
                ClassToken: GetAliasString(row, headers, "Class", "ClassId"),
                SubjectToken: GetAliasString(row, headers, "Subject", "SubjectId"),
                TopicToken: GetOptionalAliasString(row, headers, "Topic", "TopicId"),
                DifficultyLevel: GetDifficultyLevel(row, headers),
                Marks: GetShort(row, headers, "Marks"),
                EstimatedTimeSeconds: GetShort(row, headers, "EstimatedTimeSeconds", defaultValue: 60),
                Hint: GetNullableString(row, headers, "Hint"),
                Explanation: GetNullableString(row, headers, "Explanation"),
                SubmitForReview: ParseSubmitForReview(GetNullableString(row, headers, "Status")),
                Options: options,
                AcceptedAnswers: acceptedAnswers));
        }

        return rows;
    }

    public static byte[] BuildTemplate()
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.AddWorksheet("Questions");
        var headers = new[]
        {
            "QuestionText", "QuestionType", "Class", "Subject", "Topic",
            "DifficultyLevel", "Marks", "EstimatedTimeSeconds", "Hint", "Explanation", "Status",
            "Option1", "IsCorrect1", "Option2", "IsCorrect2", "Option3", "IsCorrect3",
            "Option4", "IsCorrect4", "CorrectOption",
            "AcceptedAnswer1", "IsCaseSensitive1", "AllowPartialMatch1",
            "AcceptedAnswer2", "IsCaseSensitive2", "AllowPartialMatch2"
        };

        for (var i = 0; i < headers.Length; i++)
        {
            sheet.Cell(1, i + 1).Value = headers[i];
            sheet.Cell(1, i + 1).Style.Font.Bold = true;
        }

        // Sample Single Choice — Class/Subject as IDs; CorrectOption=1 (Option1 correct).
        sheet.Cell(2, 1).Value = "Sample: Capital of Pakistan?";
        sheet.Cell(2, 2).Value = "Single Choice"; // or type id 100
        sheet.Cell(2, 3).Value = 1; // Class id or name
        sheet.Cell(2, 4).Value = 1; // Subject id or name
        sheet.Cell(2, 6).Value = 2001; // Easy (2001) / Medium (2002) / Hard (2003) or name
        sheet.Cell(2, 7).Value = 1;
        sheet.Cell(2, 8).Value = 60;
        sheet.Cell(2, 11).Value = "Draft"; // or PendingReview
        sheet.Cell(2, 12).Value = "Islamabad";
        sheet.Cell(2, 14).Value = "Karachi";
        sheet.Cell(2, 20).Value = 1; // CorrectOption index (1-based)

        // Sample Fill — Status PendingReview; accepted answers.
        sheet.Cell(3, 1).Value = "The chemical symbol for water is ____.";
        sheet.Cell(3, 2).Value = "Fill in the Blanks";
        sheet.Cell(3, 3).Value = 1;
        sheet.Cell(3, 4).Value = 1;
        sheet.Cell(3, 6).Value = "Easy";
        sheet.Cell(3, 7).Value = 1;
        sheet.Cell(3, 8).Value = 45;
        sheet.Cell(3, 11).Value = "PendingReview";
        sheet.Cell(3, 21).Value = "H2O";
        sheet.Cell(3, 22).Value = false;
        sheet.Cell(3, 23).Value = false;
        sheet.Cell(3, 24).Value = "H₂O";

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    /// <summary>
    /// Maps Status column: empty/Draft → Draft; PendingReview (aliases) → submit for review.
    /// Returns null for empty (caller defaults to Draft).
    /// </summary>
    internal static bool? ParseSubmitForReview(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return null;
        }

        var normalized = status.Trim();
        if (normalized.Equals("Draft", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (normalized.Equals("PendingReview", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("Pending", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("Under Review", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        throw new InvalidOperationException(
            $"Status '{status}' is not allowed on import. Use Draft or PendingReview only.");
    }

    private static void RequireHeader(IReadOnlyDictionary<string, int> headers, string name)
    {
        if (!headers.ContainsKey(name))
        {
            throw new InvalidOperationException($"Excel template is missing required column '{name}'.");
        }
    }

    private static void RequireAnyHeader(IReadOnlyDictionary<string, int> headers, params string[] names)
    {
        if (names.Any(headers.ContainsKey))
        {
            return;
        }

        throw new InvalidOperationException(
            $"Excel template is missing required column '{string.Join("' or '", names)}'.");
    }

    private static string GetAliasString(
        IXLRangeRow row,
        IReadOnlyDictionary<string, int> headers,
        string primary,
        string alias)
    {
        var value = GetString(row, headers, primary);
        if (!string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        return GetString(row, headers, alias);
    }

    private static string? GetOptionalAliasString(
        IXLRangeRow row,
        IReadOnlyDictionary<string, int> headers,
        string primary,
        string alias)
    {
        var value = GetAliasString(row, headers, primary, alias);
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static string GetString(IXLRangeRow row, IReadOnlyDictionary<string, int> headers, string name)
    {
        if (!headers.TryGetValue(name, out var column))
        {
            return string.Empty;
        }

        return row.Cell(column).GetFormattedString().Trim();
    }

    private static string? GetNullableString(IXLRangeRow row, IReadOnlyDictionary<string, int> headers, string name)
    {
        var value = GetString(row, headers, name);
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static short GetDifficultyLevel(IXLRangeRow row, IReadOnlyDictionary<string, int> headers)
    {
        var text = GetString(row, headers, "DifficultyLevel");
        if (string.IsNullOrWhiteSpace(text))
        {
            return 0;
        }

        if (short.TryParse(text, out var id))
        {
            return id;
        }

        return text.ToLowerInvariant() switch
        {
            "easy" => 2001,
            "medium" => 2002,
            "hard" => 2003,
            _ => 0
        };
    }

    private static short GetShort(
        IXLRangeRow row,
        IReadOnlyDictionary<string, int> headers,
        string name,
        short defaultValue = 0)
    {
        if (!headers.TryGetValue(name, out var column))
        {
            return defaultValue;
        }

        var cell = row.Cell(column);
        if (cell.TryGetValue(out double number))
        {
            return (short)number;
        }

        var text = cell.GetFormattedString().Trim();
        return short.TryParse(text, out var parsed) ? parsed : defaultValue;
    }

    private static short? GetNullableShort(IXLRangeRow row, IReadOnlyDictionary<string, int> headers, string name)
    {
        if (!headers.ContainsKey(name))
        {
            return null;
        }

        var text = GetString(row, headers, name);
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        if (short.TryParse(text, out var parsed))
        {
            return parsed;
        }

        if (headers.TryGetValue(name, out var column)
            && row.Cell(column).TryGetValue(out double number))
        {
            return (short)number;
        }

        return null;
    }

    private static bool GetBool(
        IXLRangeRow row,
        IReadOnlyDictionary<string, int> headers,
        string name,
        bool defaultValue)
    {
        if (!headers.TryGetValue(name, out var column))
        {
            return defaultValue;
        }

        var cell = row.Cell(column);
        if (cell.TryGetValue(out bool flag))
        {
            return flag;
        }

        var text = cell.GetFormattedString().Trim();
        if (bool.TryParse(text, out var parsed))
        {
            return parsed;
        }

        if (text is "1" or "yes" or "y" or "true" or "TRUE")
        {
            return true;
        }

        if (text is "0" or "no" or "n" or "false" or "FALSE")
        {
            return false;
        }

        return defaultValue;
    }
}
