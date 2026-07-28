using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Quizzes;

/// <summary>Join entity linking an approved question-bank item (or inline question) to a quiz with order and marks.</summary>
public sealed class QuizQuestion : BaseEntity
{
    private QuizQuestion()
    {
    }

    /// <summary>Creates a quiz–question link with display order, marks, and option-shuffle flag.</summary>
    public QuizQuestion(
        long quizId,
        long questionId,
        short displayOrder,
        short marks,
        bool shuffleOptions = true)
    {
        QuizId = quizId;
        QuestionId = questionId;
        DisplayOrder = displayOrder;
        Marks = marks;
        ShuffleOptions = shuffleOptions;
    }

    public long QuizId { get; private set; }
    public long QuestionId { get; private set; }
    public short DisplayOrder { get; private set; }
    public short Marks { get; private set; }
    public bool ShuffleOptions { get; private set; } = true;

    public void SetMarks(short marks)
    {
        Marks = marks;
    }

    public void SetShuffleOptions(bool shuffleOptions)
    {
        ShuffleOptions = shuffleOptions;
    }
}
