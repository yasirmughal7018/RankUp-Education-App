using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Quizzes;

/// <summary>Frozen choice option as shown during a specific attempt (order may be shuffled).</summary>
public sealed class QuizAttemptQuestionOption : BaseEntity
{
    private QuizAttemptQuestionOption()
    {
        OptionText = string.Empty;
    }

    public QuizAttemptQuestionOption(
        long quizAttemptQuestionId,
        long? sourceOptionId,
        string optionText,
        string? optionImageUrl,
        bool isCorrect,
        short displayOrder)
    {
        QuizAttemptQuestionId = quizAttemptQuestionId;
        SourceOptionId = sourceOptionId;
        OptionText = optionText;
        OptionImageUrl = optionImageUrl;
        IsCorrect = isCorrect;
        DisplayOrder = displayOrder;
    }

    public long QuizAttemptQuestionId { get; private set; }
    public long? SourceOptionId { get; private set; }
    public string OptionText { get; private set; }
    public string? OptionImageUrl { get; private set; }
    public bool IsCorrect { get; private set; }
    public short DisplayOrder { get; private set; }
}
