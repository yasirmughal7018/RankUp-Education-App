using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Quizzes;

/// <summary>
/// One student run against a quiz. Tracks in-progress drafts through submission and post-review rescoring.
/// </summary>
public sealed class QuizAttempt : BaseEntity
{
    private QuizAttempt()
    {
        DeviceId = string.Empty;
    }

    public QuizAttempt(long quizId, long studentId, short numberOfQuestionAttempt, short statusId, string deviceId)
    {
        QuizId = quizId;
        StudentId = studentId;
        NumberOfQuestionAttempt = numberOfQuestionAttempt;
        StatusId = statusId;
        DeviceId = deviceId.AsTrimmedString();
    }

    public long QuizId { get; private set; }
    public long StudentId { get; private set; }
    public short NumberOfQuestionAttempt { get; private set; }
    public short StatusId { get; private set; }
    public DateTimeOffset StartedDate { get; private set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset SubmittedDate { get; private set; } = DateTimeOffset.UtcNow;
    public short TimeSpentSeconds { get; private set; }
    public string DeviceId { get; private set; }
    public bool IsOfflineAttempt { get; private set; }

    /// <summary>Count of browser focus/visibility losses during the attempt (anti-cheat signal).</summary>
    public short FocusLossCount { get; private set; }

    /// <summary>Count of paste events into answer fields (anti-cheat signal).</summary>
    public short ClipboardPasteCount { get; private set; }

    public long? QuizReviewId { get; private set; }
    public short ObtainedMarks { get; private set; }
    public short Percentage { get; private set; }

    /// <summary>Computes percentage from obtained/total marks on submit or review.</summary>
    public void Submit(short obtainedMarks, short totalMarks, short timeSpentSeconds)
    {
        ObtainedMarks = obtainedMarks;
        TimeSpentSeconds = timeSpentSeconds;
        Percentage = totalMarks <= 0 ? (short)0 : (short)Math.Round(obtainedMarks * 100m / totalMarks);
        SubmittedDate = DateTimeOffset.UtcNow;
    }

    /// <summary>Marks attempt in-progress and resets submission timestamp for a fresh start.</summary>
    public void Begin(short inProgressStatusId)
    {
        StatusId = inProgressStatusId;
        StartedDate = DateTimeOffset.UtcNow;
        SubmittedDate = DateTimeOffset.UtcNow;
    }

    public void UpdateTimeSpent(short timeSpentSeconds)
    {
        TimeSpentSeconds = timeSpentSeconds;
    }

    public void RecordFocusLoss()
    {
        if (FocusLossCount < short.MaxValue)
        {
            FocusLossCount++;
        }
    }

    public void RecordClipboardPaste()
    {
        if (ClipboardPasteCount < short.MaxValue)
        {
            ClipboardPasteCount++;
        }
    }

    /// <summary>Competition device lock: reject resume/submit from a different client device.</summary>
    public void EnsureSameDevice(string deviceId)
    {
        var normalized = deviceId.AsTrimmedString();
        if (!string.Equals(DeviceId, normalized, StringComparison.Ordinal))
        {
            throw new BusinessRuleException("This attempt is locked to the device that started it.");
        }
    }

    /// <summary>Finalizes auto-scored submission; subjective items may still await teacher review.</summary>
    public void MarkSubmitted(short submittedStatusId, short obtainedMarks, short totalMarks, short timeSpentSeconds)
    {
        StatusId = submittedStatusId;
        Submit(obtainedMarks, totalMarks, timeSpentSeconds);
    }

    /// <summary>Replaces attempt score after teacher/parent review of subjective answers.</summary>
    public void ApplyReviewedScore(short obtainedMarks, short totalMarks, short reviewedStatusId)
    {
        StatusId = reviewedStatusId;
        Submit(obtainedMarks, totalMarks, TimeSpentSeconds);
    }
}
