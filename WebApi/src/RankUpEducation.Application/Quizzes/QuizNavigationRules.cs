using RankUpEducation.Domain.Common;

namespace RankUpEducation.Application.Quizzes;

/// <summary>
/// Server-side navigation rules for Free / Sequential / Locked attempt modes.
/// Free: no order constraints. Sequential: earlier questions must be answered first.
/// Locked: Sequential plus no editing a question after a later one has answers.
/// </summary>
public static class QuizNavigationRules
{
    public static string Normalize(string? mode)
    {
        var value = mode?.Trim() ?? "Free";
        if (value.Equals("Sequential", StringComparison.OrdinalIgnoreCase))
        {
            return "Sequential";
        }

        if (value.Equals("Locked", StringComparison.OrdinalIgnoreCase))
        {
            return "Locked";
        }

        return "Free";
    }

    /// <summary>
    /// Validates answer updates against the attempt snapshot, projecting this request's answers
    /// so batch submit (all questions at once) is allowed when the resulting set is contiguous.
    /// </summary>
    /// <param name="questionUpdates">
    /// Question ids in this request mapped to whether the update leaves a non-empty answer.
    /// </param>
    public static void EnsureAnswerUpdatesAllowed(
        string? navigationMode,
        IReadOnlyList<QuizAttemptQuestionNavItem> orderedQuestions,
        IReadOnlyDictionary<long, bool> questionUpdates)
    {
        var mode = Normalize(navigationMode);
        if (mode == "Free" || questionUpdates.Count == 0 || orderedQuestions.Count == 0)
        {
            return;
        }

        var projected = orderedQuestions
            .Select(question =>
            {
                var hasAnswer = questionUpdates.TryGetValue(question.QuestionId, out var nextHasAnswer)
                    ? nextHasAnswer
                    : question.HasAnswer;
                return question with { HasAnswer = hasAnswer };
            })
            .ToArray();

        foreach (var question in projected.Where(item => item.HasAnswer))
        {
            var earlierUnanswered = projected.Any(candidate =>
                candidate.DisplayOrder < question.DisplayOrder && !candidate.HasAnswer);
            if (earlierUnanswered)
            {
                throw new BusinessRuleException(
                    "Answer earlier questions before moving forward in this quiz.");
            }
        }

        if (mode != "Locked")
        {
            return;
        }

        foreach (var (questionId, _) in questionUpdates)
        {
            var prior = orderedQuestions.FirstOrDefault(question => question.QuestionId == questionId);
            if (prior is null || !prior.HasAnswer)
            {
                continue;
            }

            var laterAnswered = projected.Any(candidate =>
                candidate.DisplayOrder > prior.DisplayOrder && candidate.HasAnswer);
            if (laterAnswered)
            {
                throw new BusinessRuleException(
                    "Locked navigation does not allow changing earlier answers after advancing.");
            }
        }
    }
}

/// <summary>Minimal attempt-question snapshot for navigation validation.</summary>
public sealed record QuizAttemptQuestionNavItem(
    long QuestionId,
    short DisplayOrder,
    bool HasAnswer);
