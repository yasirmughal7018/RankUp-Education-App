using RankUpEducation.Domain.Auth;
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
        UserRole assignedByRole,
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
        AssignedByRole = assignedByRole;
        StartDateTime = startDateTime;
        EndDateTime = endDateTime;
        AllowedAttempts = allowedAttempts;
        QuizResultStatus = quizResultStatus;
    }

    public long QuizId { get; private set; }
    public long StudentId { get; private set; }
    public long AssignedById { get; private set; }
    public UserRole AssignedByRole { get; private set; }
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

    /// <summary>
    /// Reopens an unused expired assignment with a new schedule.
    /// Do not use when the student already has attempts — those rows must stay intact.
    /// </summary>
    public void ReopenForReassign(
        long assignedById,
        UserRole assignedByRole,
        DateTimeOffset startDateTime,
        DateTimeOffset endDateTime,
        short allowedAttempts,
        short quizResultStatus)
    {
        if (endDateTime <= startDateTime)
        {
            throw new BusinessRuleException("Quiz assignment end date must be after start date.");
        }

        AssignedById = assignedById;
        AssignedByRole = assignedByRole;
        StartDateTime = startDateTime;
        EndDateTime = endDateTime;
        AllowedAttempts = allowedAttempts;
        QuizResultStatus = quizResultStatus;
        IsReviewDone = false;
        ModifiedDate = DateTimeOffset.UtcNow;
    }

    /// <summary>
    /// Opens a new attempt window after the student already attempted.
    /// Existing attempt rows, scores, and review-done stay unchanged.
    /// </summary>
    public void GrantReassignAttempts(
        long assignedById,
        UserRole assignedByRole,
        DateTimeOffset startDateTime,
        DateTimeOffset endDateTime,
        short allowedAttempts,
        short quizResultStatus)
    {
        if (endDateTime <= startDateTime)
        {
            throw new BusinessRuleException("Quiz assignment end date must be after start date.");
        }

        if (allowedAttempts <= 0)
        {
            throw new BusinessRuleException("Allowed attempts must be greater than zero.");
        }

        AssignedById = assignedById;
        AssignedByRole = assignedByRole;
        StartDateTime = startDateTime;
        EndDateTime = endDateTime;
        AllowedAttempts = allowedAttempts;
        QuizResultStatus = quizResultStatus;
        ModifiedDate = DateTimeOffset.UtcNow;
    }

    /// <summary>Called when teacher/parent finalizes subjective-answer review for this assignment.</summary>
    public void MarkReviewDone()
    {
        IsReviewDone = true;
        ModifiedDate = DateTimeOffset.UtcNow;
    }

    /// <summary>Updates per-student result status (Not Attempted → In Progress → Under Review / Completed / Expired).</summary>
    public void SetResultStatus(short quizResultStatus)
    {
        QuizResultStatus = quizResultStatus;
        ModifiedDate = DateTimeOffset.UtcNow;
    }

    /// <summary>Adds extra attempts after quota is used. Prior attempts and review-done stay unchanged.</summary>
    public void GrantRetry(short additionalAttempts)
    {
        if (additionalAttempts <= 0)
        {
            throw new BusinessRuleException("Additional attempts must be greater than zero.");
        }

        AllowedAttempts += additionalAttempts;
        ModifiedDate = DateTimeOffset.UtcNow;
    }
}
