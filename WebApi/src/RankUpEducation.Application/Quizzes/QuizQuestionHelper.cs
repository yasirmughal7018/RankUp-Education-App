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
}
