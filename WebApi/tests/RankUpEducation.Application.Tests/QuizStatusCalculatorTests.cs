using RankUpEducation.Application.Quizzes;

namespace RankUpEducation.Application.Tests;

/// <summary>Attempt and monitor status derivation used by assign/submit/review flows.</summary>
public sealed class QuizStatusCalculatorTests
{
    private static readonly DateTimeOffset Now = new(2026, 8, 21, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void ResolveListStatus_BeforeStart_IsUpcoming()
    {
        var status = QuizStatusCalculator.ResolveListStatus(
            Now,
            startAt: Now.AddHours(2),
            endAt: Now.AddHours(4),
            attemptCount: 0,
            attemptLimit: 1,
            lastSubmittedAt: null);

        Assert.Equal("upcoming", status);
    }

    [Fact]
    public void ResolveListStatus_AfterSubmitWithinLimit_IsAvailable()
    {
        var status = QuizStatusCalculator.ResolveListStatus(
            Now,
            startAt: Now.AddHours(-1),
            endAt: Now.AddHours(2),
            attemptCount: 1,
            attemptLimit: 2,
            lastSubmittedAt: Now.AddMinutes(-10));

        Assert.Equal("available", status);
    }

    [Fact]
    public void ResolveListStatus_AllAttemptsUsed_IsCompleted()
    {
        var status = QuizStatusCalculator.ResolveListStatus(
            Now,
            startAt: Now.AddHours(-2),
            endAt: Now.AddHours(2),
            attemptCount: 2,
            attemptLimit: 2,
            lastSubmittedAt: Now.AddMinutes(-5));

        Assert.Equal("completed", status);
    }

    [Fact]
    public void ResolveResultStatus_NoAttempts_IsNotStarted()
    {
        var status = QuizStatusCalculator.ResolveResultStatus(
            attemptCount: 0,
            attemptLimit: 1,
            bestPercentage: null,
            lastSubmittedAt: null);

        Assert.Equal("Not Started", status);
    }

    [Fact]
    public void ResolveResultStatus_SubmittedWithScore_IsCompletedWhenLimitReached()
    {
        var submittedAt = Now.AddMinutes(-1);

        var inProgress = QuizStatusCalculator.ResolveResultStatus(
            attemptCount: 1,
            attemptLimit: 2,
            bestPercentage: 80,
            lastSubmittedAt: submittedAt);
        Assert.Equal("Submitted", inProgress);

        var completed = QuizStatusCalculator.ResolveResultStatus(
            attemptCount: 2,
            attemptLimit: 2,
            bestPercentage: 90,
            lastSubmittedAt: submittedAt);
        Assert.Equal("Completed", completed);
    }

    [Fact]
    public void ResolveMonitorStatus_SubmittedAwaitingReview_IsPendingReview()
    {
        var status = QuizStatusCalculator.ResolveMonitorStatus(
            Now,
            startAt: Now.AddHours(-1),
            endAt: Now.AddHours(1),
            attemptCount: 1,
            isReviewDone: false,
            lastSubmittedAt: Now.AddMinutes(-3));

        Assert.Equal("pending_review", status);
    }

    [Fact]
    public void ResolveMonitorStatus_ReviewFinalized_IsReviewed()
    {
        var status = QuizStatusCalculator.ResolveMonitorStatus(
            Now,
            startAt: Now.AddHours(-2),
            endAt: Now.AddHours(-1),
            attemptCount: 1,
            isReviewDone: true,
            lastSubmittedAt: Now.AddHours(-1).AddMinutes(-5));

        Assert.Equal("reviewed", status);
    }
}
