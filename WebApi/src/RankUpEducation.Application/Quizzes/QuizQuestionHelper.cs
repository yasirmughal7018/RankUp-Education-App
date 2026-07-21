namespace RankUpEducation.Application.Quizzes;

/// <summary>Classifies question type names for scoring, option handling, and review routing.</summary>
public static class QuizQuestionHelper
{
    /// <summary>Free-text / short-answer items requiring manual or AI review.</summary>
    public static bool IsDescriptiveType(string questionTypeName)
    {
        return MatchesAny(questionTypeName, QuizLookupNames.DescriptiveQuestionTypeNames);
    }

    /// <summary>Fill-in-the-blank items scored against accepted answers or correct option text.</summary>
    public static bool IsFillBlankType(string questionTypeName)
    {
        if (string.IsNullOrWhiteSpace(questionTypeName))
        {
            return false;
        }

        if (questionTypeName.Contains("Fill", StringComparison.OrdinalIgnoreCase)
            && questionTypeName.Contains("Blank", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return MatchesAny(questionTypeName, QuizLookupNames.FillBlankQuestionTypeNames);
    }

    /// <summary>True/false or equivalent two-option types.</summary>
    public static bool IsTrueFalseType(string questionTypeName)
    {
        if (string.IsNullOrWhiteSpace(questionTypeName))
        {
            return false;
        }

        if (questionTypeName.Contains("True", StringComparison.OrdinalIgnoreCase)
            && questionTypeName.Contains("False", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return MatchesAny(questionTypeName, QuizLookupNames.TrueFalseQuestionTypeNames);
    }

    /// <summary>Single-select MCQ; excludes multi-select, T/F, fill-blank, and descriptive aliases.</summary>
    public static bool IsSingleChoiceType(string questionTypeName)
    {
        if (IsMultiSelectType(questionTypeName)
            || IsTrueFalseType(questionTypeName)
            || IsFillBlankType(questionTypeName)
            || IsDescriptiveType(questionTypeName))
        {
            return false;
        }

        return MatchesAny(questionTypeName, QuizLookupNames.SingleChoiceQuestionTypeNames)
            || string.Equals(questionTypeName, "MCQ", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>Single-select or true/false — both use one selected option id.</summary>
    public static bool IsMcqType(string questionTypeName)
        => IsSingleChoiceType(questionTypeName) || IsTrueFalseType(questionTypeName);

    /// <summary>
    /// Multi-select: "Multiple Choice" / names containing "Multi Select" etc.
    /// Does not treat plain "MCQ" or "Single Choice" as multi-select.
    /// </summary>
    public static bool IsMultiSelectType(string questionTypeName)
    {
        if (string.IsNullOrWhiteSpace(questionTypeName))
        {
            return false;
        }

        if (MatchesAny(questionTypeName, QuizLookupNames.SingleChoiceQuestionTypeNames)
            && !MatchesAny(questionTypeName, QuizLookupNames.MultiSelectQuestionTypeNames))
        {
            return false;
        }

        if (questionTypeName.Contains("Multi Select", StringComparison.OrdinalIgnoreCase)
            || questionTypeName.Contains("Multiple Choice", StringComparison.OrdinalIgnoreCase)
            || questionTypeName.Contains("MultipleChoice", StringComparison.OrdinalIgnoreCase)
            || questionTypeName.Equals("Multiple", StringComparison.OrdinalIgnoreCase)
            || questionTypeName.Equals("MultiSelect", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return MatchesAny(questionTypeName, QuizLookupNames.MultiSelectQuestionTypeNames);
    }

    /// <summary>Whether the type presents selectable options (excludes fill-blank and descriptive).</summary>
    public static bool UsesOptions(string questionTypeName)
        => IsSingleChoiceType(questionTypeName)
            || IsMultiSelectType(questionTypeName)
            || IsTrueFalseType(questionTypeName);

    private static bool MatchesAny(string value, IReadOnlyList<string> names)
        => names.Any(name => name.Equals(value, StringComparison.OrdinalIgnoreCase));
}
