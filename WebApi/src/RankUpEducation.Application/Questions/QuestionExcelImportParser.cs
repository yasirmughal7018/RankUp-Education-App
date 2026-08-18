using RankUpEducation.Application.Lookups;
using RankUpEducation.Contracts.Questions;
using ClosedXML.Excel;

namespace RankUpEducation.Application.Questions;

/// <summary>Parses Web Excel (.xlsx) question import templates into import draft rows.</summary>
public static class QuestionExcelImportParser
{
    private const int MaxImportRows = 200;
    private const int DataRowStart = 2;
    private const int DataRowEnd = DataRowStart + MaxImportRows - 1;

    private static readonly string[] Headers =
    [
        "QuestionText", "QuestionType", "Class", "Subject", "Topic",
        "DifficultyLevel", "Marks", "EstimatedTimeSeconds", "Hint", "Explanation",
        "Option1", "Option2", "Option3", "Option4", "Option5", "Option6", "Option7", "Option8",
        "IsCorrectOption",
        "AcceptedAnswer1", "IsCaseSensitive1", "AllowPartialMatch1",
        "AcceptedAnswer2", "IsCaseSensitive2", "AllowPartialMatch2"
    ];

    private static readonly string[] IsCorrectOptionChoices =
    [
        "1", "2", "3", "4",
        "1,2", "1,3", "1,4", "2,3", "2,4", "3,4",
        "1,2,3", "1,2,4", "1,3,4", "2,3,4", "1,2,3,4"
    ];

    /// <summary>
    /// Reads the first worksheet into <see cref="QuestionExcelImportRow"/> drafts.
    /// Always intended for PendingReview create (Status column ignored by service).
    /// Class/Subject/Topic accept lookup names; choice types use OptionN + IsCorrectOption
    /// (legacy IsCorrectN / CorrectOption still supported).
    /// </summary>
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

            if (IsSampleRow(questionText))
            {
                continue;
            }

            var correctOptionIndices = ParseCorrectOptionIndices(
                GetNullableString(row, headers, "IsCorrectOption"));
            var legacyCorrectOptionIndex = GetNullableShort(row, headers, "CorrectOption");
            if (correctOptionIndices.Count == 0 && legacyCorrectOptionIndex is short legacyIndex)
            {
                correctOptionIndices.Add(legacyIndex);
            }

            var options = new List<QuestionOptionRequest>();
            for (var optionIndex = 1; optionIndex <= 8; optionIndex++)
            {
                var optionKey = $"Option{optionIndex}";
                if (!headers.ContainsKey(optionKey))
                {
                    continue;
                }

                var optionText = GetString(row, headers, optionKey);
                if (string.IsNullOrWhiteSpace(optionText))
                {
                    continue;
                }

                var markedByFlag = GetBool(row, headers, $"IsCorrect{optionIndex}", defaultValue: false);
                var markedByIndex = correctOptionIndices.Contains((short)optionIndex);
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
                Options: options,
                AcceptedAnswers: acceptedAnswers));
        }

        return rows;
    }

    public static byte[] BuildTemplate() => BuildTemplate(QuestionExcelTemplateLookups.CreateDefault());

    public static byte[] BuildTemplate(QuestionExcelTemplateLookups lookups)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.AddWorksheet("Questions");
        WriteHeaders(sheet);
        WriteSampleRows(sheet, lookups);
        ApplyColumnHints(sheet);

        var lookupSheet = workbook.AddWorksheet("_Lookups");
        WriteLookupSheet(workbook, lookupSheet, lookups);
        lookupSheet.Visibility = XLWorksheetVisibility.VeryHidden;

        ApplyDropdownValidations(sheet, lookupSheet, lookups);
        WriteNotesSheet(workbook);

        sheet.SheetView.FreezeRows(1);
        sheet.Columns().AdjustToContents(1, Headers.Length, 12, 48);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    /// <summary>Strips the subject prefix from topic dropdown labels (Subject — Topic).</summary>
    public static string? NormalizeTopicToken(string? token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        var normalized = token.Trim();
        var separatorIndex = normalized.IndexOf(" — ", StringComparison.Ordinal);
        if (separatorIndex >= 0 && separatorIndex + 3 < normalized.Length)
        {
            return normalized[(separatorIndex + 3)..].Trim();
        }

        return normalized;
    }

    private static void WriteHeaders(IXLWorksheet sheet)
    {
        for (var i = 0; i < Headers.Length; i++)
        {
            var cell = sheet.Cell(1, i + 1);
            cell.Value = Headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#E8EEF7");
        }
    }

    private static void WriteSampleRows(IXLWorksheet sheet, QuestionExcelTemplateLookups lookups)
    {
        var sampleClass = lookups.Classes.FirstOrDefault() ?? "Class 1";
        var sampleSubject = lookups.Subjects.FirstOrDefault() ?? "Mathematics";
        var sampleTopic = lookups.TopicsBySubject
            .FirstOrDefault(group =>
                group.SubjectName.Equals(sampleSubject, StringComparison.OrdinalIgnoreCase))
            ?.TopicNames.FirstOrDefault();
        var sampleDifficulty = lookups.DifficultyLevels.FirstOrDefault() ?? "Easy";

        WriteSampleRow(sheet, 2,
            "Sample Single Choice: Capital of Pakistan?",
            "Single Choice",
            sampleClass,
            sampleSubject,
            sampleTopic,
            sampleDifficulty,
            marks: 1,
            seconds: 60,
            options: ["Islamabad", "Karachi", "Lahore", "Peshawar"],
            isCorrectOption: "1");

        WriteSampleRow(sheet, 3,
            "Sample Multiple Choice: Select prime numbers",
            "Multiple Choice",
            sampleClass,
            sampleSubject,
            sampleTopic,
            sampleDifficulty,
            marks: 2,
            seconds: 90,
            options: ["2", "3", "4", "6"],
            isCorrectOption: "1,2");

        WriteSampleRow(sheet, 4,
            "Sample True/False: The Earth is flat.",
            "True/False",
            sampleClass,
            sampleSubject,
            sampleTopic,
            sampleDifficulty,
            marks: 1,
            seconds: 30,
            options: ["True", "False"],
            isCorrectOption: "2");

        WriteSampleRow(sheet, 5,
            "Sample Fill: The chemical symbol for water is ____.",
            "Fill in the Blanks",
            sampleClass,
            sampleSubject,
            sampleTopic,
            sampleDifficulty,
            marks: 1,
            seconds: 45,
            acceptedAnswers: ["H2O", "H₂O"]);

        WriteSampleRow(sheet, 6,
            "Sample Descriptive: Explain photosynthesis in one paragraph.",
            "Descriptive",
            sampleClass,
            sampleSubject,
            sampleTopic,
            sampleDifficulty,
            marks: 5,
            seconds: 180);

        WriteSampleRow(sheet, 7,
            "Sample Matching: Match capitals (left) to countries (right)",
            "Matching",
            sampleClass,
            sampleSubject,
            sampleTopic,
            sampleDifficulty,
            marks: 2,
            seconds: 120,
            options: ["Islamabad", "Pakistan", "Delhi", "India"]);

        WriteSampleRow(sheet, 8,
            "Sample Ordering: Arrange the planets from the Sun outward",
            "Ordering",
            sampleClass,
            sampleSubject,
            sampleTopic,
            sampleDifficulty,
            marks: 2,
            seconds: 120,
            options: ["Mercury", "Venus", "Earth", "Mars"]);
    }

    private static void WriteSampleRow(
        IXLWorksheet sheet,
        int rowNumber,
        string questionText,
        string questionType,
        string sampleClass,
        string sampleSubject,
        string? sampleTopic,
        string sampleDifficulty,
        short marks,
        short seconds,
        IReadOnlyList<string>? options = null,
        string? isCorrectOption = null,
        IReadOnlyList<string>? acceptedAnswers = null)
    {
        sheet.Cell(rowNumber, 1).Value = questionText;
        sheet.Cell(rowNumber, 2).Value = questionType;
        sheet.Cell(rowNumber, 3).Value = sampleClass;
        sheet.Cell(rowNumber, 4).Value = sampleSubject;
        if (!string.IsNullOrWhiteSpace(sampleTopic))
        {
            sheet.Cell(rowNumber, 5).Value = sampleTopic;
        }

        sheet.Cell(rowNumber, 6).Value = sampleDifficulty;
        sheet.Cell(rowNumber, 7).Value = marks;
        sheet.Cell(rowNumber, 8).Value = seconds;

        if (options is not null)
        {
            for (var i = 0; i < options.Count && i < 8; i++)
            {
                sheet.Cell(rowNumber, 11 + i).Value = options[i];
            }
        }

        if (!string.IsNullOrWhiteSpace(isCorrectOption))
        {
            sheet.Cell(rowNumber, 19).Value = isCorrectOption;
        }

        if (acceptedAnswers is not null)
        {
            for (var i = 0; i < acceptedAnswers.Count && i < 2; i++)
            {
                sheet.Cell(rowNumber, 20 + (i * 3)).Value = acceptedAnswers[i];
            }
        }
    }

    private static void WriteLookupSheet(
        IXLWorkbook workbook,
        IXLWorksheet sheet,
        QuestionExcelTemplateLookups lookups)
    {
        sheet.Cell(1, 1).Value = "QuestionType";
        sheet.Cell(1, 2).Value = "Class";
        sheet.Cell(1, 3).Value = "Subject";
        sheet.Cell(1, 4).Value = "DifficultyLevel";
        sheet.Cell(1, 5).Value = "IsCorrectOption";
        sheet.Cell(1, 6).Value = "YesNo";
        sheet.Cell(1, 7).Value = "SubjectForTopics";
        sheet.Cell(1, 8).Value = "TopicRangeName";
        sheet.Row(1).Style.Font.Bold = true;

        WriteLookupColumn(sheet, 1, lookups.QuestionTypes);
        WriteLookupColumn(sheet, 2, lookups.Classes);
        WriteLookupColumn(sheet, 3, lookups.Subjects);
        WriteLookupColumn(sheet, 4, lookups.DifficultyLevels);
        WriteLookupColumn(sheet, 5, IsCorrectOptionChoices);
        WriteLookupColumn(sheet, 6, ["TRUE", "FALSE"]);

        WriteSubjectTopicRanges(workbook, sheet, lookups.TopicsBySubject);
    }

    private static void WriteSubjectTopicRanges(
        IXLWorkbook workbook,
        IXLWorksheet sheet,
        IReadOnlyList<QuestionExcelTemplateTopicGroup> topicsBySubject)
    {
        const int topicColumnStart = 9;
        for (var index = 0; index < topicsBySubject.Count; index++)
        {
            var group = topicsBySubject[index];
            var column = topicColumnStart + index;
            sheet.Cell(1, column).Value = group.SubjectName;

            if (group.TopicNames.Count == 0)
            {
                sheet.Cell(2, column).Value = string.Empty;
            }
            else
            {
                for (var topicIndex = 0; topicIndex < group.TopicNames.Count; topicIndex++)
                {
                    sheet.Cell(topicIndex + 2, column).Value = group.TopicNames[topicIndex];
                }
            }

            var rangeName = BuildTopicRangeName(group.SubjectName, group.SubjectId);
            var lastRow = Math.Max(2, group.TopicNames.Count + 1);
            var topicRange = sheet.Range(sheet.Cell(2, column), sheet.Cell(lastRow, column));
            workbook.DefinedNames.Add(rangeName, topicRange);

            sheet.Cell(index + 2, 7).Value = group.SubjectName;
            sheet.Cell(index + 2, 8).Value = rangeName;
        }
    }

    private static string BuildTopicRangeName(string subjectName, short subjectId)
    {
        var sanitized = new string(subjectName
            .Select(character => char.IsLetterOrDigit(character) ? character : '_')
            .ToArray())
            .Trim('_');

        if (sanitized.Length == 0)
        {
            sanitized = "Subject";
        }

        if (!char.IsLetter(sanitized[0]) && sanitized[0] != '_')
        {
            sanitized = $"S_{sanitized}";
        }

        return $"Topics_{sanitized}_{subjectId}";
    }

    private static void WriteLookupColumn(IXLWorksheet sheet, int column, IReadOnlyList<string> values)
    {
        for (var i = 0; i < values.Count; i++)
        {
            sheet.Cell(i + 2, column).Value = values[i];
        }
    }

    private static void ApplyDropdownValidations(
        IXLWorksheet sheet,
        IXLWorksheet lookupSheet,
        QuestionExcelTemplateLookups lookups)
    {
        ApplyListValidation(sheet, 2, lookupSheet, lookups.QuestionTypes.Count, "QuestionType");
        ApplyListValidation(sheet, 3, lookupSheet, lookups.Classes.Count, "Class");
        ApplyListValidation(sheet, 4, lookupSheet, lookups.Subjects.Count, "Subject");
        ApplySubjectDependentTopicValidation(sheet, lookupSheet, lookups.TopicsBySubject);
        ApplyListValidation(sheet, 6, lookupSheet, lookups.DifficultyLevels.Count, "DifficultyLevel");
        ApplyListValidation(sheet, 19, lookupSheet, IsCorrectOptionChoices.Length, "IsCorrectOption");
        ApplyListValidation(sheet, 21, lookupSheet, 2, "YesNo");
        ApplyListValidation(sheet, 22, lookupSheet, 2, "YesNo");
        ApplyListValidation(sheet, 24, lookupSheet, 2, "YesNo");
        ApplyListValidation(sheet, 25, lookupSheet, 2, "YesNo");
    }

    private static void ApplySubjectDependentTopicValidation(
        IXLWorksheet sheet,
        IXLWorksheet lookupSheet,
        IReadOnlyList<QuestionExcelTemplateTopicGroup> topicsBySubject)
    {
        if (topicsBySubject.Count == 0)
        {
            return;
        }

        var mappingLastRow = topicsBySubject.Count + 1;
        var source = $"=INDIRECT(VLOOKUP($D2,'{lookupSheet.Name}'!$G$2:$H${mappingLastRow},2,FALSE))";
        var target = sheet.Range(
            sheet.Cell(DataRowStart, 5),
            sheet.Cell(DataRowEnd, 5));

        var validation = target.CreateDataValidation();
        validation.List(source, true);
        validation.InCellDropdown = true;
        validation.IgnoreBlanks = true;
        validation.ShowInputMessage = true;
        validation.InputTitle = "Topic";
        validation.InputMessage =
            "Optional. Select Subject first — the Topic list shows only topics for that subject.";
    }

    private static void ApplyListValidation(
        IXLWorksheet sheet,
        int columnIndex,
        IXLWorksheet lookupSheet,
        int valueCount,
        string lookupHeader)
    {
        if (valueCount <= 0)
        {
            return;
        }

        var lookupColumn = lookupHeader switch
        {
            "QuestionType" => 1,
            "Class" => 2,
            "Subject" => 3,
            "DifficultyLevel" => 4,
            "IsCorrectOption" => 5,
            "YesNo" => 6,
            _ => 1
        };

        var lastRow = valueCount + 1;
        var source = $"'{lookupSheet.Name}'!${LookupColumnLetter(lookupColumn)}$2:${LookupColumnLetter(lookupColumn)}${lastRow}";
        var target = sheet.Range(
            sheet.Cell(DataRowStart, columnIndex),
            sheet.Cell(DataRowEnd, columnIndex));

        var validation = target.CreateDataValidation();
        validation.List(source, true);
        validation.InCellDropdown = true;
        validation.IgnoreBlanks = true;
        validation.ShowInputMessage = true;
        validation.InputTitle = Headers[columnIndex - 1];
        validation.InputMessage = lookupHeader switch
        {
            "IsCorrectOption" =>
                "Single Choice / True-False / Media: one option number (1–4). Multiple Choice: comma-separated numbers (e.g. 1,3). Leave blank for Fill, Descriptive, Matching, Ordering.",
            "Subject" => "Select Subject before Topic — the Topic dropdown lists only topics for this subject.",
            _ => $"Choose a value from the {lookupHeader} list."
        };
    }

    private static string LookupColumnLetter(int column) =>
        column switch
        {
            1 => "A",
            2 => "B",
            3 => "C",
            4 => "D",
            5 => "E",
            6 => "F",
            _ => "A"
        };

    private static void ApplyColumnHints(IXLWorksheet sheet)
    {
        sheet.Column(11).Group(4, false);
        sheet.Column(15).Group(4, true);
    }

    private static void WriteNotesSheet(XLWorkbook workbook)
    {
        var notes = workbook.AddWorksheet("Notes");
        notes.Cell(1, 1).Value = "Question import template guide";
        notes.Cell(1, 1).Style.Font.Bold = true;

        var lines = new[]
        {
            "Delete sample rows before importing, or leave them — rows starting with \"Sample \" are ignored.",
            "All imported questions start as PendingReview (PortalAdmin auto-publishes).",
            "Use dropdowns for QuestionType, Class, Subject, Topic, and DifficultyLevel.",
            "Select Subject before Topic — the Topic dropdown lists only topics linked to that subject.",
            "",
            "Columns by question type:",
            "• Single Choice / True-False: Option1–Option4, IsCorrectOption = one number (1–4).",
            "• Multiple Choice: Option1–Option4 (or more), IsCorrectOption = comma-separated numbers (e.g. 1,3).",
            "• Fill in the Blanks: AcceptedAnswer1/2 (+ optional case/partial flags); leave options blank.",
            "• Descriptive: no options or accepted answers required.",
            "• Matching: even count ≥4 in Option1–Option8 (left items, then right items).",
            "• Ordering: Option1–Option8 in correct sequence; leave IsCorrectOption blank.",
            "",
            "File Upload and Media are not offered for import.",
            "Legacy columns IsCorrect1–4 and CorrectOption are still read if present."
        };

        for (var i = 0; i < lines.Length; i++)
        {
            notes.Cell(i + 2, 1).Value = lines[i];
        }

        notes.Column(1).Width = 96;
    }

    private static bool IsSampleRow(string questionText)
        => questionText.StartsWith("Sample ", StringComparison.OrdinalIgnoreCase);

    private static HashSet<short> ParseCorrectOptionIndices(string? raw)
    {
        var indices = new HashSet<short>();
        if (string.IsNullOrWhiteSpace(raw))
        {
            return indices;
        }

        foreach (var part in raw.Split(',', ';'))
        {
            var trimmed = part.Trim();
            if (short.TryParse(trimmed, out var index) && index is >= 1 and <= 8)
            {
                indices.Add(index);
            }
        }

        return indices;
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
            "easy" => LookupNames.DifficultyLevelIds.Easy,
            "medium" => LookupNames.DifficultyLevelIds.Medium,
            "hard" => LookupNames.DifficultyLevelIds.Hard,
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
