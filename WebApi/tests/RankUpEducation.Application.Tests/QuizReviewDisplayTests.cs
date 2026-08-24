using RankUpEducation.Application.Quizzes;

namespace RankUpEducation.Application.Tests;

/// <summary>Auto-graded results announce 1 hour after quiz completion; subjective stay pending.</summary>
public sealed class QuizReviewDisplayTests
{
    private static readonly DateTimeOffset Submitted = new(2026, 8, 24, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Resolve_BeforeDelay_HidesAllResults()
    {
        var visibility = QuizReviewDisplay.Resolve(
            isReviewDone: false,
            now: Submitted.AddMinutes(30),
            submittedAt: Submitted,
            assignmentEndAt: Submitted,
            questions: [(true, 10), (false, 10)]);

        Assert.False(visibility.ObjectiveReleased);
        Assert.False(visibility.ShowScore);
        Assert.Equal(0, visibility.AnnouncedPercent);
        Assert.True(visibility.ReviewPending);
        Assert.False(visibility.IsQuestionAnnounced(true));
    }

    [Fact]
    public void Resolve_AfterDelay_AnnouncesAutoGradedOnly()
    {
        var visibility = QuizReviewDisplay.Resolve(
            isReviewDone: false,
            now: Submitted.AddHours(1).AddMinutes(1),
            submittedAt: Submitted,
            assignmentEndAt: Submitted,
            questions: [(true, 70), (false, 30)]);

        Assert.True(visibility.ObjectiveReleased);
        Assert.True(visibility.ShowScore);
        Assert.Equal(70, visibility.AnnouncedPercent);
        Assert.True(visibility.ReviewPending);
        Assert.True(visibility.IsQuestionAnnounced(true));
        Assert.False(visibility.IsQuestionAnnounced(false));
    }

    [Fact]
    public void Resolve_WaitsUntilAssignmentWindowEndsPlusOneHour()
    {
        var windowEnd = Submitted.AddHours(2);
        var visibility = QuizReviewDisplay.Resolve(
            isReviewDone: false,
            now: Submitted.AddHours(2).AddMinutes(30),
            submittedAt: Submitted,
            assignmentEndAt: windowEnd,
            questions: [(true, 10)]);

        Assert.False(visibility.ObjectiveReleased);
        Assert.Equal(0, visibility.AnnouncedPercent);

        var afterDelay = QuizReviewDisplay.Resolve(
            isReviewDone: false,
            now: windowEnd.AddHours(1),
            submittedAt: Submitted,
            assignmentEndAt: windowEnd,
            questions: [(true, 10)]);

        Assert.True(afterDelay.ObjectiveReleased);
        Assert.Equal(100, afterDelay.AnnouncedPercent);
    }

    [Fact]
    public void Resolve_WhenReviewDone_ShowsFullResults()
    {
        var visibility = QuizReviewDisplay.Resolve(
            isReviewDone: true,
            now: Submitted.AddMinutes(5),
            submittedAt: Submitted,
            assignmentEndAt: Submitted,
            questions: [(true, 8), (false, 2)]);

        Assert.False(visibility.ReviewPending);
        Assert.Equal(100, visibility.AnnouncedPercent);
        Assert.True(visibility.IsQuestionAnnounced(false));
    }

    [Fact]
    public void ResolveListAnnouncedPercent_IsNullWhenNotSubmitted()
    {
        var percent = QuizReviewDisplay.ResolveListAnnouncedPercent(
            now: Submitted,
            submittedAt: null,
            assignmentEndAt: Submitted,
            isReviewDone: false,
            autoGradedMarks: 8,
            totalMarks: 10);

        Assert.Null(percent);
    }

    [Fact]
    public void ApplyListResultStatus_UsesPendingPartialAndCompletedLabels()
    {
        Assert.Equal("Not Started", QuizReviewDisplay.ApplyListResultStatus("Not Started", null));
        Assert.Equal("Results pending", QuizReviewDisplay.ApplyListResultStatus("Under Review", 0));
        Assert.Equal("Partial results", QuizReviewDisplay.ApplyListResultStatus("Under Review", 70));
        Assert.Equal("Completed", QuizReviewDisplay.ApplyListResultStatus("Under Review", 100));
        Assert.Equal("Reviewed", QuizReviewDisplay.ApplyListResultStatus("Reviewed", 100));
    }
}
