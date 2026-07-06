using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Quizzes;

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
}
