using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Quizzes;

/// <summary>Stores one selected option or free-text response for an attempt question.</summary>
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

    /// <summary>Sets awarded marks and correctness after auto-score or manual review.</summary>
    public void Mark(short awardedMarks, bool isCorrect)
    {
        AwardedMarks = awardedMarks;
        IsCorrect = isCorrect;
    }

    /// <summary>Replaces draft answer and clears prior scoring (used during in-progress saves).</summary>
    public void UpdateDraft(long? questionOptionId, string? submittedText)
    {
        QuestionOptionId = questionOptionId;
        SubmittedText = submittedText.AsTrimmedOrNull();
        IsCorrect = false;
        AwardedMarks = 0;
    }
}
