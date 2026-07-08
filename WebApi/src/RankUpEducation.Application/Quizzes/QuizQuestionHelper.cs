namespace RankUpEducation.Application.Quizzes;

public static class QuizQuestionHelper
{
    public static bool IsDescriptiveType(string questionTypeName)
    {
        return QuizLookupNames.DescriptiveQuestionTypeNames
            .Any(name => name.Equals(questionTypeName, StringComparison.OrdinalIgnoreCase));
    }

    public static bool IsMcqType(string questionTypeName)
    {
        return QuizLookupNames.McqQuestionTypeNames
            .Any(name => name.Equals(questionTypeName, StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Multi-select detection aligned with Mobile: lookup names containing "Multi"
    /// (e.g. "Multiple Choice") map to multi-select UI (type id 41); plain "MCQ" stays single-select.
    /// </summary>
    public static bool IsMultiSelectType(string questionTypeName)
    {
        if (string.IsNullOrWhiteSpace(questionTypeName))
        {
            return false;
        }

        if (questionTypeName.Contains("Multi", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return QuizLookupNames.MultiSelectQuestionTypeNames
            .Any(name => name.Equals(questionTypeName, StringComparison.OrdinalIgnoreCase));
    }
}
