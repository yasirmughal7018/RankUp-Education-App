using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Quizzes;

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
        DeviceId = deviceId.Trim();
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
    public long? QuizReviewId { get; private set; }
    public short ObtainedMarks { get; private set; }
    public short Percentage { get; private set; }

    public void Submit(short obtainedMarks, short totalMarks, short timeSpentSeconds)
    {
        ObtainedMarks = obtainedMarks;
        TimeSpentSeconds = timeSpentSeconds;
        Percentage = totalMarks <= 0 ? (short)0 : (short)Math.Round(obtainedMarks * 100m / totalMarks);
        SubmittedDate = DateTimeOffset.UtcNow;
    }

    public void Begin(short inProgressStatusId)
    {
        StatusId = inProgressStatusId;
        StartedDate = DateTimeOffset.UtcNow;
        SubmittedDate = DateTimeOffset.UtcNow;
    }

    public void MarkSubmitted(short submittedStatusId, short obtainedMarks, short totalMarks, short timeSpentSeconds)
    {
        StatusId = submittedStatusId;
        Submit(obtainedMarks, totalMarks, timeSpentSeconds);
    }
}
