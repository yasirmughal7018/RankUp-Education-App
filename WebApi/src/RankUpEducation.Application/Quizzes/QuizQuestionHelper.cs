using RankUpEducation.Application.Lookups;
using RankUpEducation.Common.Utilities;

namespace RankUpEducation.Application.Quizzes;

/// <summary>Classifies question type names for scoring, option handling, and review routing.</summary>
public static class QuizQuestionHelper
{
    /// <summary>Free-text / short-answer items requiring manual or AI review.</summary>
    public static bool IsDescriptiveType(string questionTypeName)
    {
        return MatchesAny(questionTypeName, LookupNames.DescriptiveQuestionTypeNames);
    }

    /// <summary>File-upload answers — always teacher-reviewed.</summary>
    public static bool IsFileUploadType(string questionTypeName)
        => MatchesAny(questionTypeName, LookupNames.FileUploadQuestionTypeNames);

    /// <summary>Left/right matching (even option count: first half left, second half right).</summary>
    public static bool IsMatchingType(string questionTypeName)
        => MatchesAny(questionTypeName, LookupNames.MatchingQuestionTypeNames);

    /// <summary>Put options into the correct sequence (DisplayOrder).</summary>
    public static bool IsOrderingType(string questionTypeName)
        => MatchesAny(questionTypeName, LookupNames.OrderingQuestionTypeNames);

    /// <summary>Image/media choice — scored like single choice.</summary>
    public static bool IsMediaType(string questionTypeName)
        => MatchesAny(questionTypeName, LookupNames.MediaQuestionTypeNames);

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

        return MatchesAny(questionTypeName, LookupNames.FillBlankQuestionTypeNames);
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

        return MatchesAny(questionTypeName, LookupNames.TrueFalseQuestionTypeNames);
    }

    /// <summary>Single-select MCQ; excludes multi-select, T/F, fill-blank, and descriptive aliases.</summary>
    public static bool IsSingleChoiceType(string questionTypeName)
    {
        if (IsMultiSelectType(questionTypeName)
            || IsTrueFalseType(questionTypeName)
            || IsFillBlankType(questionTypeName)
            || IsDescriptiveType(questionTypeName)
            || IsFileUploadType(questionTypeName)
            || IsMatchingType(questionTypeName)
            || IsOrderingType(questionTypeName))
        {
            return false;
        }

        return MatchesAny(questionTypeName, LookupNames.SingleChoiceQuestionTypeNames)
            || MatchesAny(questionTypeName, LookupNames.MediaQuestionTypeNames)
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

        if (MatchesAny(questionTypeName, LookupNames.SingleChoiceQuestionTypeNames)
            && !MatchesAny(questionTypeName, LookupNames.MultiSelectQuestionTypeNames))
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

        return MatchesAny(questionTypeName, LookupNames.MultiSelectQuestionTypeNames);
    }

    /// <summary>Whether the type presents selectable options (excludes fill-blank, descriptive, and file).</summary>
    public static bool UsesOptions(string questionTypeName)
        => IsSingleChoiceType(questionTypeName)
            || IsMultiSelectType(questionTypeName)
            || IsTrueFalseType(questionTypeName)
            || IsMatchingType(questionTypeName)
            || IsOrderingType(questionTypeName)
            || IsMediaType(questionTypeName);

    /// <summary>
    /// True when submitted answers include subjective items that need teacher/parent review
    /// (descriptive / file upload, or fill-blank with AllowTeacherReview).
    /// </summary>
    public static bool HasSubjectiveAnswersRequiringReview(
        IEnumerable<QuizAttemptQuestionItem> questions)
    {
        foreach (var question in questions)
        {
            if (!question.SubmittedText.HasTrimmedText())
            {
                continue;
            }

            var typeName = question.QuestionTypeName;
            var isFillBlank = IsFillBlankType(typeName);
            if (isFillBlank)
            {
                var accepted = question.AcceptedAnswers ?? Array.Empty<QuestionAcceptedAnswerScoreItem>();
                if (accepted.Any(answer => answer.AllowTeacherReview))
                {
                    return true;
                }

                continue;
            }

            if (IsDescriptiveType(typeName)
                || IsFileUploadType(typeName)
                || (question.SelectedOptionIds.Count == 0 && question.SelectedOptionId is null))
            {
                return true;
            }
        }

        return false;
    }

    private static bool MatchesAny(string value, IReadOnlyList<string> names)
        => names.Any(name => name.Equals(value, StringComparison.OrdinalIgnoreCase));
}
