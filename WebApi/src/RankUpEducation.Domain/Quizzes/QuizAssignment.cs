using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Quizzes;

/// <summary>
/// Grants a student access to a quiz within a start/end window and attempt limit.
/// Tracks review completion and supports retry grants after review finalization.
/// </summary>
public sealed class QuizAssignment : BaseEntity
{
    private QuizAssignment()
    {
    }

    public QuizAssignment(
        long quizId,
        long studentId,
        long assignedById,
        DateTimeOffset startDateTime,
        DateTimeOffset endDateTime,
        short allowedAttempts,
        short quizResultStatus)
    {
        if (endDateTime <= startDateTime)
        {
            throw new BusinessRuleException("Quiz assignment end date must be after start date.");
        }

        QuizId = quizId;
        StudentId = studentId;
        AssignedById = assignedById;
        StartDateTime = startDateTime;
        EndDateTime = endDateTime;
        AllowedAttempts = allowedAttempts;
        QuizResultStatus = quizResultStatus;
    }

    public long QuizId { get; private set; }
    public long StudentId { get; private set; }
    public long AssignedById { get; private set; }
    public long? StudentGroupId { get; private set; }
    public DateTimeOffset StartDateTime { get; private set; }
    public DateTimeOffset EndDateTime { get; private set; }
    public short AllowedAttempts { get; private set; }
    public short QuizResultStatus { get; private set; }
    public bool IsReviewDone { get; private set; }
    public DateTimeOffset CreatedDate { get; private set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ModifiedDate { get; private set; }

    /// <summary>Records a group-based assignment; individual student rows still exist per member.</summary>
    public void AssignToGroup(long studentGroupId)
    {
        StudentGroupId = studentGroupId;
    }

    /// <summary>Called when teacher/parent finalizes subjective-answer review for this assignment.</summary>
    public void MarkReviewDone()
    {
        IsReviewDone = true;
        ModifiedDate = DateTimeOffset.UtcNow;
    }

    /// <summary>Extends attempt allowance and reopens review after all attempts were exhausted.</summary>
    public void GrantRetry(short additionalAttempts)
    {
        if (additionalAttempts <= 0)
        {
            throw new BusinessRuleException("Additional attempts must be greater than zero.");
        }

        AllowedAttempts += additionalAttempts;
        IsReviewDone = false;
        ModifiedDate = DateTimeOffset.UtcNow;
    }
}
