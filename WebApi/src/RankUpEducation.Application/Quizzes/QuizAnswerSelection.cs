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
    /// Match/Order slots in submitted order. Empty slots stay 0 so pair/position indexes do not shift.
    /// </summary>
    public static IReadOnlyList<long> ResolveAlignedComponentIds(SubmitQuizAnswerRequest answer)
    {
        if (answer.SelectedOptionIds is { Count: > 0 })
        {
            return answer.SelectedOptionIds
                .Select(id => id > 0 ? id : 0L)
                .ToArray();
        }

        if (answer.SelectedOptionId is long singleId && singleId > 0)
        {
            return [singleId];
        }

        return [];
    }

    /// <summary>
    /// Restores Match/Order component order from persisted answer rows (including unmatched slots).
    /// </summary>
    public static IReadOnlyList<long> AggregateAlignedComponentIds(
        IEnumerable<long?> optionIds)
    {
        return optionIds
            .Select(id => id is > 0 ? id.Value : 0L)
            .ToArray();
    }

    /// <summary>Match and Order score each slot independently; empty slots must stay in place.</summary>
    public static bool UsesAlignedSlots(string? questionTypeName)
    {
        var typeName = questionTypeName ?? string.Empty;
        return QuizQuestionHelper.IsMatchingType(typeName)
            || QuizQuestionHelper.IsOrderingType(typeName);
    }

    /// <summary>Resolves submitted option ids using set semantics for MC and slot order for Match/Order.</summary>
    public static IReadOnlyList<long> ResolveComponentIds(
        SubmitQuizAnswerRequest answer,
        string? questionTypeName)
        => UsesAlignedSlots(questionTypeName)
            ? ResolveAlignedComponentIds(answer)
            : ResolveSelectedOptionIds(answer);

    /// <summary>Rebuilds selected option ids from persisted rows (caller must pass rows in slot order).</summary>
    public static IReadOnlyList<long> AggregateComponentIds(
        IEnumerable<long?> optionIds,
        string? questionTypeName)
        => UsesAlignedSlots(questionTypeName)
            ? AggregateAlignedComponentIds(optionIds)
            : AggregateSelectedOptionIds(optionIds);

    /// <summary>Empty Match/Order slots persist as null so the option FK stays valid.</summary>
    public static long? ToPersistedOptionId(long optionId)
        => optionId > 0 ? optionId : null;

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
