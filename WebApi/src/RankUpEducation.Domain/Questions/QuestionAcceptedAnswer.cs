using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Questions;

public sealed class QuestionAcceptedAnswer : BaseEntity
{
    private QuestionAcceptedAnswer()
    {
        AnswerText = string.Empty;
        NormalizedAnswer = string.Empty;
    }

    public QuestionAcceptedAnswer(
        long questionId,
        string answerText,
        bool isCaseSensitive = false,
        bool allowPartialMatch = false,
        short minimumLength = 0,
        short maximumLength = 1000,
        bool allowAiReview = false,
        bool allowTeacherReview = false)
    {
        QuestionId = questionId;
        AnswerText = answerText.AsTrimmedString();
        NormalizedAnswer = answerText.AsLowercase();
        IsCaseSensitive = isCaseSensitive;
        AllowPartialMatch = allowPartialMatch;
        MinimumLength = minimumLength < 0 ? (short)0 : minimumLength;
        MaximumLength = maximumLength <= 0 ? (short)1000 : maximumLength;
        AllowAiReview = allowAiReview;
        AllowTeacherReview = allowTeacherReview;
    }

    public long QuestionId { get; private set; }
    public string AnswerText { get; private set; }
    public bool IsCaseSensitive { get; private set; }
    public bool AllowPartialMatch { get; private set; }
    public string NormalizedAnswer { get; private set; }
    public short MinimumLength { get; private set; }
    public short MaximumLength { get; private set; } = 1000;
    /// <summary>Legacy review text column — prefer attempt-level review storage for new work.</summary>
    public string? AiReview { get; private set; }
    /// <summary>Legacy review text column — prefer attempt-level review storage for new work.</summary>
    public string? TeacherReview { get; private set; }
    public bool AllowAiReview { get; private set; }
    public bool AllowTeacherReview { get; private set; }

    public bool Matches(string submittedText)
    {
        if (string.IsNullOrWhiteSpace(submittedText))
        {
            return false;
        }

        var submitted = submittedText.AsTrimmedString();
        if (MinimumLength > 0 && submitted.Length < MinimumLength)
        {
            return false;
        }

        if (MaximumLength > 0 && submitted.Length > MaximumLength)
        {
            return false;
        }

        if (AllowPartialMatch)
        {
            if (IsCaseSensitive)
            {
                return submitted.Contains(AnswerText, StringComparison.Ordinal)
                    || AnswerText.Contains(submitted, StringComparison.Ordinal);
            }

            return submitted.Contains(AnswerText, StringComparison.OrdinalIgnoreCase)
                || AnswerText.Contains(submitted, StringComparison.OrdinalIgnoreCase);
        }

        return IsCaseSensitive
            ? string.Equals(AnswerText, submitted, StringComparison.Ordinal)
            : string.Equals(NormalizedAnswer, submitted.AsLowercase(), StringComparison.Ordinal);
    }
}
