namespace RankUpEducation.Application.Quizzes;

/// <summary>Resolves what students may see on the post-submit result screen.</summary>
public static class QuizReviewDisplay
{
    public const string Full = "Full";
    public const string CorrectAnswers = "CorrectAnswers";
    public const string ScoreOnly = "ScoreOnly";
    public const string Withheld = "Withheld";

    public sealed record Visibility(
        string Mode,
        bool ShowScore,
        bool ShowCorrectAnswers,
        bool ShowExplanations,
        bool ReviewPending);

    public static string Normalize(string? mode)
    {
        var value = mode?.Trim() ?? ScoreOnly;
        if (value.Equals(Full, StringComparison.OrdinalIgnoreCase))
        {
            return Full;
        }

        if (value.Equals(CorrectAnswers, StringComparison.OrdinalIgnoreCase)
            || value.Equals("Correct", StringComparison.OrdinalIgnoreCase))
        {
            return CorrectAnswers;
        }

        if (value.Equals(Withheld, StringComparison.OrdinalIgnoreCase)
            || value.Equals("None", StringComparison.OrdinalIgnoreCase))
        {
            return Withheld;
        }

        return ScoreOnly;
    }

    /// <summary>
    /// Withheld hides score/answers until review is published (<c>IsReviewDone</c>).
    /// Other modes still mask when review is required, subjective answers exist, and review is not done.
    /// </summary>
    public static Visibility Resolve(
        string? reviewDisplayMode,
        bool isReviewRequired,
        bool isReviewDone,
        bool hasSubjectiveAnswers)
    {
        var mode = Normalize(reviewDisplayMode);
        var reviewIncomplete = isReviewRequired && !isReviewDone;
        var pendingPublication = mode == Withheld
            ? reviewIncomplete
            : reviewIncomplete && hasSubjectiveAnswers;

        if (pendingPublication)
        {
            return new Visibility(mode, false, false, false, true);
        }

        return mode switch
        {
            Full => new Visibility(mode, true, true, true, false),
            CorrectAnswers => new Visibility(mode, true, true, false, false),
            Withheld => new Visibility(mode, true, false, false, false),
            _ => new Visibility(ScoreOnly, true, false, false, false),
        };
    }
}
