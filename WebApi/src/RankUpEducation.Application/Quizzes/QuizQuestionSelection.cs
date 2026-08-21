using RankUpEducation.Application.Common.Exceptions;

namespace RankUpEducation.Application.Quizzes;

/// <summary>Selects the question pool for an attempt (optional random N-of-M) then orders/shuffles.</summary>
public static class QuizQuestionSelection
{
    /// <summary>
    /// When <paramref name="randomQuestionCount"/> is set and less than the pool size, randomly picks that many
    /// questions without replacement, then applies display-order shuffle rules.
    /// </summary>
    public static IReadOnlyList<T> SelectForAttempt<T>(
        IReadOnlyList<T> questions,
        Func<T, short> displayOrderSelector,
        short? randomQuestionCount,
        bool shuffleQuestions,
        Random? random = null)
    {
        var rng = random ?? Random.Shared;
        var pool = questions.ToList();

        if (randomQuestionCount is > 0)
        {
            var count = randomQuestionCount.Value;
            if (count < pool.Count)
            {
                pool = pool.OrderBy(_ => rng.Next()).Take(count).ToList();
            }
        }

        return QuizQuestionOrder.OrderForAttempt(pool, displayOrderSelector, shuffleQuestions, rng);
    }

    /// <summary>Validates random subset settings against the attached question count.</summary>
    public static void ValidateRandomQuestionCount(short? randomQuestionCount, short totalQuestions)
    {
        if (randomQuestionCount is null or <= 0)
        {
            return;
        }

        if (totalQuestions <= 0)
        {
            throw new ValidationAppException(
                ["Set at least one question before configuring a random question count."]);
        }

        if (randomQuestionCount > totalQuestions)
        {
            throw new ValidationAppException(
                [$"Random question count ({randomQuestionCount}) cannot exceed the quiz question count ({totalQuestions})."]);
        }
    }

    /// <summary>Stores null when all questions are used (count unset, zero, or ≥ pool size).</summary>
    public static short? NormalizeRandomQuestionCount(short? randomQuestionCount, short totalQuestions)
    {
        if (randomQuestionCount is null or <= 0 || totalQuestions <= 0)
        {
            return null;
        }

        return randomQuestionCount >= totalQuestions ? null : randomQuestionCount;
    }
}
