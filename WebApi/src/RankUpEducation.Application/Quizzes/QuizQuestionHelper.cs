namespace RankUpEducation.Application.Quizzes;

public static class QuizQuestionHelper
{
    public static bool IsDescriptiveType(string questionTypeName)
    {
        return MatchesAny(questionTypeName, QuizLookupNames.DescriptiveQuestionTypeNames);
    }

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

    public static bool UsesOptions(string questionTypeName)
        => IsSingleChoiceType(questionTypeName)
            || IsMultiSelectType(questionTypeName)
            || IsTrueFalseType(questionTypeName);

    private static bool MatchesAny(string value, IReadOnlyList<string> names)
        => names.Any(name => name.Equals(value, StringComparison.OrdinalIgnoreCase));
}
