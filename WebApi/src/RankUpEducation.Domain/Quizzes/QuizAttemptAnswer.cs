using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Quizzes;

public sealed class QuizAttemptAnswer : BaseEntity
{
    private QuizAttemptAnswer()
    {
    }

    public QuizAttemptAnswer(long quizAttemptQuestionId, long? questionOptionId, string? submittedText)
    {
        QuizAttemptQuestionId = quizAttemptQuestionId;
        QuestionOptionId = questionOptionId;
        SubmittedText = submittedText;
    }

    public long QuizAttemptQuestionId { get; private set; }
    public long? QuestionOptionId { get; private set; }
    public bool IsCorrect { get; private set; }
    public short AwardedMarks { get; private set; }
    public string? SubmittedText { get; private set; }

    public void Mark(short awardedMarks, bool isCorrect)
    {
        AwardedMarks = awardedMarks;
        IsCorrect = isCorrect;
    }
}
