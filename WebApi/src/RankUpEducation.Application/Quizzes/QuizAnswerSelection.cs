using RankUpEducation.Contracts.Quizzes;

namespace RankUpEducation.Application.Quizzes;

/// <summary>Normalizes submitted option ids and scores multi-select answers.</summary>
public static class QuizAnswerSelection
{
    /// <summary>Prefers <c>SelectedOptionIds</c> array; falls back to legacy single <c>SelectedOptionId</c>.</summary>
    public static IReadOnlyList<long> ResolveSelectedOptionIds(SubmitQuizAnswerRequest answer)
    {
        if (answer.SelectedOptionIds is { Count: > 0 })
        {
            return answer.SelectedOptionIds
                .Where(id => id > 0)
                .Distinct()
                .ToArray();
        }

        if (answer.SelectedOptionId is long singleId && singleId > 0)
        {
            return [singleId];
        }

        return [];
    }

    /// <summary>
    /// Partial-credit multi-select: each expected correct option is one component.
    /// Extra incorrect selections are not extra components and do not count as correct.
    /// </summary>
    public static QuizPartialCreditResult ScoreMultiSelect(
        IReadOnlyList<long> selectedOptionIds,
        IReadOnlyList<long> correctOptionIds,
        short marks)
    {
        var correct = correctOptionIds.Where(id => id > 0).Distinct().ToArray();
        var selected = selectedOptionIds.Where(id => id > 0).Distinct().ToHashSet();
        var correctSelected = correct.Count(selected.Contains);
        return QuizPartialCredit.Award(marks, correctSelected, correct.Length);
    }

    /// <summary>
    /// Each matching pair (left in order → expected right) is one component.
    /// </summary>
    public static QuizPartialCreditResult ScoreMatching(
        IReadOnlyList<long> selectedRightIds,
        IReadOnlyList<long> correctRightIds,
        short marks)
    {
        return ScoreAlignedComponents(selectedRightIds, correctRightIds, marks);
    }

    /// <summary>
    /// Each required position is one component.
    /// </summary>
    public static QuizPartialCreditResult ScoreOrdering(
        IReadOnlyList<long> selectedOrderIds,
        IReadOnlyList<long> correctOrderIds,
        short marks)
    {
        return ScoreAlignedComponents(selectedOrderIds, correctOrderIds, marks);
    }

    private static QuizPartialCreditResult ScoreAlignedComponents(
        IReadOnlyList<long> selected,
        IReadOnlyList<long> expected,
        short marks)
    {
        if (expected.Count == 0)
        {
            return QuizPartialCredit.Award(marks, 0, 0);
        }

        var correctCount = 0;
        for (var index = 0; index < expected.Count; index++)
        {
            if (index < selected.Count && selected[index] == expected[index])
            {
                correctCount++;
            }
        }

        return QuizPartialCredit.Award(marks, correctCount, expected.Count);
    }

    /// <summary>Collects distinct option ids from multiple attempt-answer rows (multi-select storage).</summary>
    public static IReadOnlyList<long> AggregateSelectedOptionIds(
        IEnumerable<long?> optionIds)
    {
        return optionIds
            .Where(id => id is > 0)
            .Select(id => id!.Value)
            .Distinct()
            .ToArray();
    }
}
