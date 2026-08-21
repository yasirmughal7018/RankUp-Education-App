using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Quizzes;

namespace RankUpEducation.Application.Tests;

public sealed class QuizQuestionSelectionTests
{
    private sealed record QuestionStub(short DisplayOrder, string Label);

    [Fact]
    public void SelectForAttempt_UsesAllQuestions_WhenRandomCountUnset()
    {
        var pool = Enumerable.Range(1, 5)
            .Select(index => new QuestionStub((short)index, $"Q{index}"))
            .ToArray();

        var selected = QuizQuestionSelection.SelectForAttempt(
            pool,
            item => item.DisplayOrder,
            randomQuestionCount: null,
            shuffleQuestions: false);

        Assert.Equal(5, selected.Count);
        Assert.Equal(["Q1", "Q2", "Q3", "Q4", "Q5"], selected.Select(item => item.Label));
    }

    [Fact]
    public void SelectForAttempt_PicksRandomSubset_ThenOrdersByDisplayOrder()
    {
        var pool = Enumerable.Range(1, 6)
            .Select(index => new QuestionStub((short)index, $"Q{index}"))
            .ToArray();
        var rng = new Random(42);

        var selected = QuizQuestionSelection.SelectForAttempt(
            pool,
            item => item.DisplayOrder,
            randomQuestionCount: 3,
            shuffleQuestions: false,
            rng);

        Assert.Equal(3, selected.Count);
        Assert.Equal(
            selected.OrderBy(item => item.DisplayOrder).Select(item => item.Label),
            selected.Select(item => item.Label));
    }

    [Fact]
    public void ValidateRandomQuestionCount_RejectsAbovePoolSize()
    {
        var ex = Assert.Throws<ValidationAppException>(() =>
            QuizQuestionSelection.ValidateRandomQuestionCount(6, 5));

        Assert.Contains("cannot exceed", ex.Errors[0], StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void NormalizeRandomQuestionCount_StoresNullWhenUsingAllQuestions()
    {
        Assert.Null(QuizQuestionSelection.NormalizeRandomQuestionCount(10, 10));
        Assert.Null(QuizQuestionSelection.NormalizeRandomQuestionCount(null, 10));
        Assert.Equal((short)4, QuizQuestionSelection.NormalizeRandomQuestionCount(4, 10));
    }
}
