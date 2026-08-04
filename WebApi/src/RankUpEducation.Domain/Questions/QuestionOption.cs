using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Questions;

/// <summary>
/// Choice option for Single Choice, Multiple Choice, True/False, Matching, Ordering, or Media.
/// Fill-in-the-Blank answers use <see cref="QuestionAcceptedAnswer"/> instead.
/// </summary>
public sealed class QuestionOption : BaseEntity
{
    private QuestionOption()
    {
        OptionText = string.Empty;
    }

    public QuestionOption(
        long questionId,
        string optionText,
        bool isCorrect,
        string? optionImageUrl = null)
    {
        QuestionId = questionId;
        // Text may be empty for Media options that rely on OptionImageUrl.
        OptionText = optionText.AsTrimmedString();
        IsCorrect = isCorrect;
        OptionImageUrl = optionImageUrl.AsTrimmedOrNull();
    }

    public long QuestionId { get; private set; }
    public string OptionText { get; private set; }
    public string? OptionImageUrl { get; private set; }
    public bool IsCorrect { get; private set; }
    public string? Explanation { get; private set; }
    public bool IsActive { get; private set; } = true;
}
