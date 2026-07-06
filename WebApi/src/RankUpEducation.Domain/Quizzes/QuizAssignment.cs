using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Quizzes;

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
}
