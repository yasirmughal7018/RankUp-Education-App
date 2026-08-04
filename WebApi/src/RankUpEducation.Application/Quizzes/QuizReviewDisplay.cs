namespace RankUpEducation.Application.Quizzes;

/// <summary>
/// Resolves what students may see on the post-submit result screen.
/// Review display modes were removed — results are Full once review is not pending.
/// </summary>
public static class QuizReviewDisplay
{
    public const string Full = "Full";

    public sealed record Visibility(
        string Mode,
        bool ShowScore,
        bool ShowCorrectAnswers,
        bool ShowExplanations,
        bool ReviewPending);

    /// <summary>
    /// Hides score/answers while review is required and not yet done; otherwise shows full results.
    /// </summary>
    public static Visibility Resolve(
        string? reviewDisplayMode,
        bool isReviewRequired,
        bool isReviewDone,
        bool hasSubjectiveAnswers)
    {
        _ = reviewDisplayMode;
        _ = hasSubjectiveAnswers;

        if (isReviewRequired && !isReviewDone)
        {
            return new Visibility(Full, false, false, false, true);
        }

        return new Visibility(Full, true, true, true, false);
    }
}
