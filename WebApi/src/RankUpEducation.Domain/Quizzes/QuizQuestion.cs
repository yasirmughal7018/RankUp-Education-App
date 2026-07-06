using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Quizzes;

public sealed class QuizQuestion : BaseEntity
{
    private QuizQuestion()
    {
    }

    public QuizQuestion(long quizId, long questionId, short displayOrder, short marks)
    {
        QuizId = quizId;
        QuestionId = questionId;
        DisplayOrder = displayOrder;
        Marks = marks;
    }

    public long QuizId { get; private set; }
    public long QuestionId { get; private set; }
    public short DisplayOrder { get; private set; }
    public short Marks { get; private set; }
    public bool ShuffleOptions { get; private set; } = true;
}
