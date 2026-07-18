namespace RankUpEducation.Application.Quizzes;

public static class QuizQuestionOrder
{
    public static IReadOnlyList<T> OrderForAttempt<T>(
        IReadOnlyList<T> questions,
        Func<T, short> displayOrderSelector,
        bool shuffleQuestions,
        Random? random = null)
    {
        var ordered = questions.OrderBy(displayOrderSelector).ToList();
        if (!shuffleQuestions || ordered.Count <= 1)
        {
            return ordered;
        }

        var rng = random ?? Random.Shared;
        return ordered.OrderBy(_ => rng.Next()).ToList();
    }
}
