using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Quizzes;

/// <summary>Snapshot of a bank question as presented in a specific attempt (order may differ from quiz definition).</summary>
public sealed class QuizAttemptQuestion : BaseEntity
{
    private QuizAttemptQuestion()
    {
    }

    public QuizAttemptQuestion(long quizAttemptId, long questionId, short displayOrder)
    {
        QuizAttemptId = quizAttemptId;
        QuestionId = questionId;
        DisplayOrder = displayOrder;
    }

    public long QuizAttemptId { get; private set; }
    public long QuestionId { get; private set; }
    public short DisplayOrder { get; private set; }
    public long? QuizReviewId { get; private set; }

    /// <summary>Associates per-question teacher/parent/AI feedback with this attempt row.</summary>
    public void LinkReview(long quizReviewId)
    {
        QuizReviewId = quizReviewId;
    }
}
