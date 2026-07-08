using RankUpEducation.Contracts.Quizzes;

namespace RankUpEducation.Application.Quizzes;

public static class QuizAnswerSelection
{
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
    /// Exact-match multi-select scoring: all correct options selected and no incorrect ones.
    /// </summary>
    public static (bool IsCorrect, short AwardedMarks) ScoreMultiSelect(
        IReadOnlyList<long> selectedOptionIds,
        IReadOnlyList<long> correctOptionIds,
        short marks)
    {
        if (correctOptionIds.Count == 0 || selectedOptionIds.Count == 0)
        {
            return (false, 0);
        }

        var selected = selectedOptionIds.ToHashSet();
        var correct = correctOptionIds.ToHashSet();
        var isExactMatch = selected.SetEquals(correct);
        return isExactMatch ? (true, marks) : (false, (short)0);
    }

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
