using RankUpEducation.Contracts.Questions;
using ClosedXML.Excel;

namespace RankUpEducation.Application.Questions;

/// <summary>Parses Web Excel (.xlsx) question import templates into create requests.</summary>
public static class QuestionExcelImportParser
{
    public static IReadOnlyList<CreateQuestionRequest> Parse(Stream stream)
    {
        using var workbook = new XLWorkbook(stream);
        var worksheet = workbook.Worksheets.First();
        var range = worksheet.RangeUsed();
        if (range is null)
        {
            return Array.Empty<CreateQuestionRequest>();
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
        RequireHeader(headers, "ClassId");
        RequireHeader(headers, "SubjectId");
        RequireHeader(headers, "DifficultyLevel");
        RequireHeader(headers, "Marks");

        var rows = new List<CreateQuestionRequest>();
        foreach (var row in range.RowsUsed().Skip(1))
        {
            var questionText = GetString(row, headers, "QuestionText");
            if (string.IsNullOrWhiteSpace(questionText))
            {
                continue;
            }

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

                var isCorrect = GetBool(row, headers, correctKey, defaultValue: false);
                options.Add(new QuestionOptionRequest(optionText, isCorrect));
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

            rows.Add(new CreateQuestionRequest(
                QuestionText: questionText,
                QuestionType: GetString(row, headers, "QuestionType"),
                ClassId: GetShort(row, headers, "ClassId"),
                SubjectId: GetShort(row, headers, "SubjectId"),
                TopicId: GetNullableShort(row, headers, "TopicId"),
                DifficultyLevel: GetShort(row, headers, "DifficultyLevel"),
                Marks: GetShort(row, headers, "Marks"),
                EstimatedTimeSeconds: GetShort(row, headers, "EstimatedTimeSeconds", defaultValue: 60),
                Hint: GetNullableString(row, headers, "Hint"),
                Explanation: GetNullableString(row, headers, "Explanation"),
                Options: options,
                AcceptedAnswers: acceptedAnswers,
                SubmitForReview: false));
        }

        return rows;
    }

    public static byte[] BuildTemplate()
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.AddWorksheet("Questions");
        var headers = new[]
        {
            "QuestionText", "QuestionType", "ClassId", "SubjectId", "TopicId",
            "DifficultyLevel", "Marks", "EstimatedTimeSeconds", "Hint", "Explanation",
            "Option1", "IsCorrect1", "Option2", "IsCorrect2", "Option3", "IsCorrect3",
            "Option4", "IsCorrect4",
            "AcceptedAnswer1", "IsCaseSensitive1", "AllowPartialMatch1",
            "AcceptedAnswer2", "IsCaseSensitive2", "AllowPartialMatch2"
        };

        for (var i = 0; i < headers.Length; i++)
        {
            sheet.Cell(1, i + 1).Value = headers[i];
            sheet.Cell(1, i + 1).Style.Font.Bold = true;
        }

        sheet.Cell(2, 1).Value = "Sample: Capital of Pakistan?";
        sheet.Cell(2, 2).Value = "Single Choice";
        sheet.Cell(2, 3).Value = 1;
        sheet.Cell(2, 4).Value = 1;
        sheet.Cell(2, 6).Value = 2001;
        sheet.Cell(2, 7).Value = 1;
        sheet.Cell(2, 8).Value = 60;
        sheet.Cell(2, 11).Value = "Islamabad";
        sheet.Cell(2, 12).Value = true;
        sheet.Cell(2, 13).Value = "Karachi";
        sheet.Cell(2, 14).Value = false;

        sheet.Cell(3, 1).Value = "The chemical symbol for water is ____.";
        sheet.Cell(3, 2).Value = "Fill in the Blanks";
        sheet.Cell(3, 3).Value = 1;
        sheet.Cell(3, 4).Value = 1;
        sheet.Cell(3, 6).Value = 2001;
        sheet.Cell(3, 7).Value = 1;
        sheet.Cell(3, 8).Value = 45;
        sheet.Cell(3, 19).Value = "H2O";
        sheet.Cell(3, 20).Value = false;
        sheet.Cell(3, 21).Value = false;
        sheet.Cell(3, 22).Value = "H₂O";

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private static void RequireHeader(IReadOnlyDictionary<string, int> headers, string name)
    {
        if (!headers.ContainsKey(name))
        {
            throw new InvalidOperationException($"Excel template is missing required column '{name}'.");
        }
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

        var value = GetShort(row, headers, name, defaultValue: 0);
        return value == 0 ? null : value;
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
