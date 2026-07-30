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
            // Descriptive / free-text: length heuristic when no accepted answers exist.
            var wordCount = submitted
                .Split([' ', '\t', '\r', '\n'], StringSplitOptions.RemoveEmptyEntries)
                .Length;
            if (wordCount >= 40)
            {
                var high = (short)Math.Max(1, (request.MaxMarks * 3) / 4);
                return Task.FromResult(new QuizAiReviewSuggestion(
                    false,
                    high,
                    $"AI heuristic: substantial free-text answer (~{wordCount} words) — suggested {high}/{request.MaxMarks}. Teacher should confirm."));
            }

            if (wordCount >= 12)
            {
                var mid = (short)Math.Max(1, request.MaxMarks / 2);
                return Task.FromResult(new QuizAiReviewSuggestion(
                    false,
                    mid,
                    $"AI heuristic: moderate free-text answer (~{wordCount} words) — suggested {mid}/{request.MaxMarks}. Teacher should confirm."));
            }

            var low = (short)Math.Max(0, request.MaxMarks / 4);
            return Task.FromResult(new QuizAiReviewSuggestion(
                false,
                low,
                $"AI heuristic: short free-text answer (~{wordCount} words) — suggested {low}/{request.MaxMarks}. Teacher should confirm."));
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
