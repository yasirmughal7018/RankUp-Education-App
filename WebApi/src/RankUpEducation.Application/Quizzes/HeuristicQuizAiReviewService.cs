using RankUpEducation.Common.Utilities;

namespace RankUpEducation.Application.Quizzes;

/// <summary>
/// Local heuristic AI stand-in: compares submitted text to accepted answers with
/// normalization and partial containment. Explicitly not an external LLM provider.
/// </summary>
public sealed class HeuristicQuizAiReviewService : IQuizAiReviewService
{
    public Task<QuizAiReviewSuggestion> SuggestAsync(
        QuizAiReviewRequest request,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var submitted = Normalize(request.SubmittedText);
        if (!submitted.HasTrimmedText())
        {
            return Task.FromResult(new QuizAiReviewSuggestion(
                false,
                0,
                "AI heuristic: empty answer — suggested 0 marks."));
        }

        var accepted = request.AcceptedAnswers
            .Select(Normalize)
            .Where(text => text.HasTrimmedText())
            .ToArray();

        if (accepted.Length == 0)
        {
            // Fall back to auto-score when no accepted answers are available.
            return Task.FromResult(new QuizAiReviewSuggestion(
                request.AutoScoreIsCorrect,
                request.AutoAwardedMarks,
                $"AI heuristic: no accepted answers configured; kept auto-score {request.AutoAwardedMarks}/{request.MaxMarks}."));
        }

        if (accepted.Any(answer => string.Equals(answer, submitted, StringComparison.Ordinal)))
        {
            return Task.FromResult(new QuizAiReviewSuggestion(
                true,
                request.MaxMarks,
                $"AI heuristic: exact match after normalization ({request.MaxMarks}/{request.MaxMarks})."));
        }

        if (accepted.Any(answer =>
                submitted.Contains(answer, StringComparison.Ordinal)
                || answer.Contains(submitted, StringComparison.Ordinal)))
        {
            var partial = (short)Math.Max(1, request.MaxMarks / 2);
            return Task.FromResult(new QuizAiReviewSuggestion(
                false,
                partial,
                $"AI heuristic: partial match — suggested {partial}/{request.MaxMarks}. Teacher may override."));
        }

        return Task.FromResult(new QuizAiReviewSuggestion(
            false,
            0,
            $"AI heuristic: no match — suggested 0/{request.MaxMarks}. Teacher may override."));
    }

    private static string Normalize(string? value)
    {
        if (!value.HasTrimmedText())
        {
            return string.Empty;
        }

        var trimmed = value.AsTrimmedString().ToLowerInvariant();
        return string.Join(
            ' ',
            trimmed.Split([' ', '\t', '\r', '\n'], StringSplitOptions.RemoveEmptyEntries));
    }
}
