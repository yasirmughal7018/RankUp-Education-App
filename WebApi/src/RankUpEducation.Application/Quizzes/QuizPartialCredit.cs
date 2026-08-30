namespace RankUpEducation.Application.Quizzes;

/// <summary>
/// Proportional marks for multi-component objective items (multi-select, match, order).
/// Awarded marks are always floored.
/// </summary>
public readonly record struct QuizPartialCreditResult(
    short MaximumMarks,
    int CorrectComponents,
    int TotalComponents,
    short CorrectPercentage,
    short AwardedMarks)
{
    public bool IsFullyCorrect
        => TotalComponents > 0
            && CorrectComponents == TotalComponents
            && AwardedMarks == MaximumMarks;
}

/// <summary>Shared percentage + floor rounding for partial-credit question types.</summary>
public static class QuizPartialCredit
{
    public static QuizPartialCreditResult Award(
        short maximumMarks,
        int correctComponents,
        int totalComponents)
    {
        var total = Math.Max(0, totalComponents);
        var correct = Math.Clamp(correctComponents, 0, total);

        if (maximumMarks <= 0 || total == 0 || correct == 0)
        {
            return new QuizPartialCreditResult(maximumMarks, correct, total, 0, 0);
        }

        var percentage = (short)Math.Floor(100m * correct / total);
        var awarded = (short)Math.Floor(maximumMarks * (decimal)correct / total);
        return new QuizPartialCreditResult(maximumMarks, correct, total, percentage, awarded);
    }
}
