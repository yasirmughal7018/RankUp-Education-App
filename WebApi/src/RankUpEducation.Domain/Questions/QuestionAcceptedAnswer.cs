using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Questions;

public sealed class QuestionAcceptedAnswer : BaseEntity
{
    private QuestionAcceptedAnswer()
    {
        AnswerText = string.Empty;
        NormalizedAnswer = string.Empty;
    }

    public QuestionAcceptedAnswer(long questionId, string answerText)
    {
        QuestionId = questionId;
        AnswerText = answerText.Trim();
        NormalizedAnswer = answerText.Trim().ToLowerInvariant();
    }

    public long QuestionId { get; private set; }
    public string AnswerText { get; private set; }
    public bool IsCaseSensitive { get; private set; }
    public bool AllowPartialMatch { get; private set; }
    public string NormalizedAnswer { get; private set; }
    public short MinimumLength { get; private set; }
    public long MaximumLength { get; private set; } = 1000;
    public string? AiReview { get; private set; }
    public string? TeacherReview { get; private set; }
}
