using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Quizzes;

/// <summary>Join entity linking an approved question-bank item (or inline question) to a quiz with order and marks.</summary>
public sealed class QuizQuestion : BaseEntity
{
    private QuizQuestion()
    {
    }

    /// <summary>Creates a quiz–question link with display order, marks, and per-question time budget.</summary>
    public QuizQuestion(
        long quizId,
        long questionId,
        short displayOrder,
        short marks,
        short timeInSec = 0)
    {
        QuizId = quizId;
        QuestionId = questionId;
        DisplayOrder = displayOrder;
        Marks = marks;
        TimeInSec = timeInSec;
    }

    public long QuizId { get; private set; }
    public long QuestionId { get; private set; }
    public short DisplayOrder { get; private set; }
    public short Marks { get; private set; }
    /// <summary>Per-question time budget on this quiz (seconds). Option shuffle is controlled at quiz level.</summary>
    public short TimeInSec { get; private set; }

    public void SetMarks(short marks)
    {
        Marks = marks;
    }

    public void SetTimeInSec(short timeInSec)
    {
        TimeInSec = timeInSec < 0 ? (short)0 : timeInSec;
    }
}
