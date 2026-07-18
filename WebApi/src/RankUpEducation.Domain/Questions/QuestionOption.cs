using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Questions;

public sealed class QuestionOption : BaseEntity
{
    private QuestionOption()
    {
        OptionText = string.Empty;
    }

    public QuestionOption(long questionId, string optionText, bool isCorrect)
    {
        QuestionId = questionId;
        OptionText = optionText.AsTrimmedString();
        IsCorrect = isCorrect;
    }

    public long QuestionId { get; private set; }
    public string OptionText { get; private set; }
    public string? OptionImageUrl { get; private set; }
    public bool IsCorrect { get; private set; }
    public string? Explanation { get; private set; }
    public bool IsActive { get; private set; } = true;
}
