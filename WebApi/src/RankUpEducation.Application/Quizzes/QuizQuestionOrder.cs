namespace RankUpEducation.Application.Quizzes;

/// <summary>Orders quiz questions for an attempt, optionally shuffling after stable sort by display order.</summary>
public static class QuizQuestionOrder
{
    /// <summary>Returns display-ordered questions, shuffled in-place when requested.</summary>
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
