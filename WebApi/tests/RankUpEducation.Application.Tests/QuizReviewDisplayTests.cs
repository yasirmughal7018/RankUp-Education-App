using RankUpEducation.Application.Quizzes;

namespace RankUpEducation.Application.Tests;

/// <summary>Post-submit result visibility while subjective review is pending.</summary>
public sealed class QuizReviewDisplayTests
{
    [Fact]
    public void Resolve_WhenReviewRequiredAndNotDone_HidesScoreAndAnswers()
    {
        var visibility = QuizReviewDisplay.Resolve(
            reviewDisplayMode: "Full",
            isReviewRequired: true,
            isReviewDone: false,
            hasSubjectiveAnswers: true);

        Assert.True(visibility.ReviewPending);
        Assert.False(visibility.ShowScore);
        Assert.False(visibility.ShowCorrectAnswers);
        Assert.False(visibility.ShowExplanations);
    }

    [Fact]
    public void Resolve_WhenReviewDone_ShowsFullResults()
    {
        var visibility = QuizReviewDisplay.Resolve(
            reviewDisplayMode: "ScoreOnly",
            isReviewRequired: true,
            isReviewDone: true,
            hasSubjectiveAnswers: true);

        Assert.False(visibility.ReviewPending);
        Assert.True(visibility.ShowScore);
        Assert.True(visibility.ShowCorrectAnswers);
        Assert.True(visibility.ShowExplanations);
    }

    [Fact]
    public void Resolve_WhenReviewNotRequired_ShowsFullResultsImmediately()
    {
        var visibility = QuizReviewDisplay.Resolve(
            reviewDisplayMode: null,
            isReviewRequired: false,
            isReviewDone: false,
            hasSubjectiveAnswers: false);

        Assert.False(visibility.ReviewPending);
        Assert.True(visibility.ShowScore);
    }
}
