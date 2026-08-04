using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Quizzes;

/// <summary>Frozen accepted fill-blank answer for scoring a specific attempt question.</summary>
public sealed class QuizAttemptAcceptedAnswer : BaseEntity
{
    private QuizAttemptAcceptedAnswer()
    {
        AnswerText = string.Empty;
        NormalizedAnswer = string.Empty;
    }

    public QuizAttemptAcceptedAnswer(
        long quizAttemptQuestionId,
        string answerText,
        bool isCaseSensitive,
        bool allowPartialMatch,
        string normalizedAnswer,
        short minimumLength,
        short maximumLength,
        bool allowAiReview,
        bool allowTeacherReview)
    {
        QuizAttemptQuestionId = quizAttemptQuestionId;
        AnswerText = answerText;
        IsCaseSensitive = isCaseSensitive;
        AllowPartialMatch = allowPartialMatch;
        NormalizedAnswer = normalizedAnswer;
        MinimumLength = minimumLength;
        MaximumLength = maximumLength;
        AllowAiReview = allowAiReview;
        AllowTeacherReview = allowTeacherReview;
    }

    public long QuizAttemptQuestionId { get; private set; }
    public string AnswerText { get; private set; }
    public bool IsCaseSensitive { get; private set; }
    public bool AllowPartialMatch { get; private set; }
    public string NormalizedAnswer { get; private set; }
    public short MinimumLength { get; private set; }
    public short MaximumLength { get; private set; }
    public bool AllowAiReview { get; private set; }
    public bool AllowTeacherReview { get; private set; }
}
