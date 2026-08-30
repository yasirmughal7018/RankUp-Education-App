using RankUpEducation.Common.Utilities;

namespace RankUpEducation.Domain.Questions;

/// <summary>How a submitted fill-blank answer compares to one accepted answer.</summary>
public enum FillBlankMatchKind
{
    None = 0,
    Partial = 1,
    Full = 2,
}

/// <summary>Accepted-answer fields needed to score a fill-blank submission.</summary>
public readonly record struct FillBlankAcceptedAnswer(
    string AnswerText,
    bool IsCaseSensitive,
    bool AllowPartialMatch,
    short MinimumLength,
    short MaximumLength,
    bool AllowAiReview,
    bool AllowTeacherReview);

/// <summary>Aggregate fill-blank result used on quiz submit.</summary>
public readonly record struct FillBlankEvaluation(
    bool IsFullyCorrect,
    bool HasPartialMatch,
    bool NeedsAiReview,
    bool NeedsTeacherReview);

/// <summary>
/// Single fill-blank matcher used by the domain entity and quiz submit scoring.
/// Full match auto-grades; partial match never counts as fully correct.
/// </summary>
public static class FillBlankAnswerMatching
{
    public static FillBlankMatchKind Classify(
        string? submittedText,
        string acceptedText,
        bool isCaseSensitive,
        bool allowPartialMatch,
        short minimumLength,
        short maximumLength)
    {
        var submitted = submittedText.AsTrimmedString();
        var accepted = acceptedText.AsTrimmedString();
        if (submitted.Length == 0 || accepted.Length == 0)
        {
            return FillBlankMatchKind.None;
        }

        if (minimumLength > 0 && submitted.Length < minimumLength)
        {
            return FillBlankMatchKind.None;
        }

        if (maximumLength > 0 && submitted.Length > maximumLength)
        {
            return FillBlankMatchKind.None;
        }

        if (IsExactMatch(submitted, accepted, isCaseSensitive))
        {
            return FillBlankMatchKind.Full;
        }

        if (allowPartialMatch && IsContainedMatch(submitted, accepted, isCaseSensitive))
        {
            return FillBlankMatchKind.Partial;
        }

        return FillBlankMatchKind.None;
    }

    public static FillBlankEvaluation Evaluate(
        string? submittedText,
        IEnumerable<FillBlankAcceptedAnswer> answers)
    {
        var best = FillBlankMatchKind.None;
        var needsAi = false;
        var needsTeacher = false;

        foreach (var answer in answers)
        {
            var kind = Classify(
                submittedText,
                answer.AnswerText,
                answer.IsCaseSensitive,
                answer.AllowPartialMatch,
                answer.MinimumLength,
                answer.MaximumLength);

            if (kind > best)
            {
                best = kind;
            }

            needsAi |= answer.AllowAiReview;
            needsTeacher |= answer.AllowTeacherReview;
        }

        var fullyCorrect = best == FillBlankMatchKind.Full;
        return new FillBlankEvaluation(
            fullyCorrect,
            HasPartialMatch: best == FillBlankMatchKind.Partial,
            NeedsAiReview: !fullyCorrect && needsAi,
            NeedsTeacherReview: !fullyCorrect && needsTeacher);
    }

    private static bool IsExactMatch(string submitted, string accepted, bool isCaseSensitive)
        => isCaseSensitive
            ? string.Equals(submitted, accepted, StringComparison.Ordinal)
            : string.Equals(
                submitted.AsLowercase(),
                accepted.AsLowercase(),
                StringComparison.Ordinal);

    private static bool IsContainedMatch(string submitted, string accepted, bool isCaseSensitive)
    {
        var comparison = isCaseSensitive
            ? StringComparison.Ordinal
            : StringComparison.OrdinalIgnoreCase;
        return submitted.Contains(accepted, comparison)
            || accepted.Contains(submitted, comparison);
    }
}
