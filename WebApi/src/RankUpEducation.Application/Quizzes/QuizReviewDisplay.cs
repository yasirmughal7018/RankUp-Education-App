namespace RankUpEducation.Application.Quizzes;

/// <summary>
/// Resolves what students may see on the post-submit result screen.
/// Auto-graded questions (correct answers already on the item) are announced
/// 1 hour after the quiz window completes. Teacher-review items stay pending
/// until review is published.
/// </summary>
public static class QuizReviewDisplay
{
    public const string Full = "Full";
    public const int ObjectiveAnnouncementDelayHours = 1;

    public sealed record Visibility(
        string Mode,
        bool ShowScore,
        bool ShowCorrectAnswers,
        bool ShowExplanations,
        bool ReviewPending,
        bool ObjectiveReleased,
        bool ReviewDone,
        short AnnouncedPercent,
        DateTimeOffset? AnnouncesAt)
    {
        public bool IsQuestionAnnounced(bool isAutoGraded)
            => ReviewDone || (isAutoGraded && ObjectiveReleased);
    }

    /// <summary>
    /// Quiz completion is the later of submit and assignment end, then +1 hour.
    /// If the student submits before the window ends, answers stay hidden until
    /// the quiz completes and the delay elapses.
    /// </summary>
    public static DateTimeOffset? ResolveAnnouncementAt(
        DateTimeOffset? submittedAt,
        DateTimeOffset? assignmentEndAt)
    {
        if (submittedAt is null)
        {
            return null;
        }

        var completedAt = assignmentEndAt is { } end && end > submittedAt.Value
            ? end
            : submittedAt.Value;

        return completedAt.AddHours(ObjectiveAnnouncementDelayHours);
    }

    public static short ComputeAnnouncedPercent(
        IReadOnlyList<(bool IsAutoGraded, short Marks)> questions,
        bool objectiveReleased,
        bool reviewDone)
    {
        if (questions.Count == 0)
        {
            return 0;
        }

        var total = questions.Sum(question => Math.Max(0, (int)question.Marks));
        if (total <= 0)
        {
            return reviewDone || objectiveReleased ? (short)100 : (short)0;
        }

        if (reviewDone)
        {
            return 100;
        }

        var announced = questions
            .Where(question => question.IsAutoGraded && objectiveReleased)
            .Sum(question => Math.Max(0, (int)question.Marks));

        return (short)Math.Clamp((int)Math.Round(announced * 100m / total), 0, 100);
    }

    public static Visibility Resolve(
        bool isReviewDone,
        DateTimeOffset now,
        DateTimeOffset? submittedAt,
        DateTimeOffset? assignmentEndAt,
        IReadOnlyList<(bool IsAutoGraded, short Marks)> questions)
    {
        var announcesAt = ResolveAnnouncementAt(submittedAt, assignmentEndAt);
        var objectiveReleased = isReviewDone
            || (announcesAt is { } at && now >= at);
        var announcedPercent = ComputeAnnouncedPercent(
            questions,
            objectiveReleased,
            isReviewDone);
        var reviewPending = announcedPercent < 100;

        return new Visibility(
            Full,
            ShowScore: announcedPercent > 0,
            ShowCorrectAnswers: objectiveReleased || isReviewDone,
            ShowExplanations: objectiveReleased || isReviewDone,
            ReviewPending: reviewPending,
            ObjectiveReleased: objectiveReleased,
            ReviewDone: isReviewDone,
            AnnouncedPercent: announcedPercent,
            AnnouncesAt: announcesAt);
    }

    /// <summary>
    /// List/detail estimate when per-attempt questions are not loaded.
    /// </summary>
    public static short? ResolveListAnnouncedPercent(
        DateTimeOffset now,
        DateTimeOffset? submittedAt,
        DateTimeOffset? assignmentEndAt,
        bool isReviewDone,
        short autoGradedMarks,
        short totalMarks)
    {
        if (submittedAt is null)
        {
            return null;
        }

        var questions = new List<(bool IsAutoGraded, short Marks)>(2);
        if (autoGradedMarks > 0)
        {
            questions.Add((true, autoGradedMarks));
        }

        var pendingMarks = (short)Math.Max(0, totalMarks - autoGradedMarks);
        if (pendingMarks > 0)
        {
            questions.Add((false, pendingMarks));
        }

        var visibility = Resolve(
            isReviewDone,
            now,
            submittedAt,
            assignmentEndAt,
            questions);
        return visibility.AnnouncedPercent;
    }

    /// <summary>Attempt result status while scores are still rolling out.</summary>
    public static string? ResolveResultStatusOverride(short announcedPercent)
    {
        if (announcedPercent >= 100)
        {
            return null;
        }

        return announcedPercent > 0 ? "Partial results" : "Results pending";
    }

    /// <summary>
    /// List/detail status: pending until the delay, then partial, then the stored
    /// completed/reviewed name (or Completed if the stored value is still a review label).
    /// </summary>
    public static string ApplyListResultStatus(string storedStatus, short? announcedPercent)
    {
        if (announcedPercent is null)
        {
            return storedStatus;
        }

        var pendingLabel = ResolveResultStatusOverride(announcedPercent.Value);
        if (pendingLabel is not null)
        {
            return pendingLabel;
        }

        if (string.IsNullOrWhiteSpace(storedStatus)
            || IsPendingResultStatus(storedStatus))
        {
            return "Completed";
        }

        return storedStatus;
    }

    private static bool IsPendingResultStatus(string storedStatus)
    {
        if (storedStatus.Contains("Reviewed", StringComparison.OrdinalIgnoreCase)
            || storedStatus.Equals("Completed", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return storedStatus.Contains("Review", StringComparison.OrdinalIgnoreCase)
            || storedStatus.Contains("Pending", StringComparison.OrdinalIgnoreCase)
            || storedStatus.Equals("Submitted", StringComparison.OrdinalIgnoreCase)
            || storedStatus.Equals("AutoSubmitted", StringComparison.OrdinalIgnoreCase);
    }
}
