using RankUpEducation.Application.Quizzes;
using RankUpEducation.Contracts.Quizzes;

namespace RankUpEducation.Application.Tests;

public sealed class QuizAnswerSelectionTests
{
    [Fact]
    public void ScoreMultiSelect_ExactMatch_AwardsFullMarks()
    {
        var (isCorrect, awarded) = QuizAnswerSelection.ScoreMultiSelect(
            selectedOptionIds: [1, 3],
            correctOptionIds: [3, 1],
            marks: 5);

        Assert.True(isCorrect);
        Assert.Equal((short)5, awarded);
    }

    [Fact]
    public void ScoreMultiSelect_MissingOrExtraOption_AwardsZero()
    {
        var missing = QuizAnswerSelection.ScoreMultiSelect([1], [1, 2], 5);
        Assert.False(missing.IsCorrect);
        Assert.Equal((short)0, missing.AwardedMarks);

        var extra = QuizAnswerSelection.ScoreMultiSelect([1, 2, 3], [1, 2], 5);
        Assert.False(extra.IsCorrect);
        Assert.Equal((short)0, extra.AwardedMarks);
    }

    [Fact]
    public void ResolveSelectedOptionIds_PrefersList_FallsBackToSingle()
    {
        var fromList = QuizAnswerSelection.ResolveSelectedOptionIds(
            new SubmitQuizAnswerRequest(10, SelectedOptionId: 99, SubmittedText: null, SelectedOptionIds: [1, 2]));
        Assert.Equal([1L, 2L], fromList);

        var fromSingle = QuizAnswerSelection.ResolveSelectedOptionIds(
            new SubmitQuizAnswerRequest(10, SelectedOptionId: 7, SubmittedText: null));
        Assert.Equal([7L], fromSingle);
    }
}

public sealed class QuizQuestionOrderTests
{
    [Fact]
    public void OrderForAttempt_WhenShuffleFalse_KeepsDisplayOrder()
    {
        var questions = new[]
        {
            (Id: 1L, Order: (short)3),
            (Id: 2L, Order: (short)1),
            (Id: 3L, Order: (short)2)
        };

        var ordered = QuizQuestionOrder.OrderForAttempt(
            questions,
            item => item.Order,
            shuffleQuestions: false);

        Assert.Equal([2L, 3L, 1L], ordered.Select(item => item.Id).ToArray());
    }

    [Fact]
    public void OrderForAttempt_WhenShuffleTrue_CanChangeOrder()
    {
        var questions = Enumerable.Range(1, 8)
            .Select(i => (Id: (long)i, Order: (short)i))
            .ToArray();

        var shuffled = QuizQuestionOrder.OrderForAttempt(
            questions,
            item => item.Order,
            shuffleQuestions: true,
            random: new Random(42));

        var originalIds = questions.Select(item => item.Id).ToArray();
        var shuffledIds = shuffled.Select(item => item.Id).ToArray();

        Assert.Equal(originalIds.OrderBy(id => id), shuffledIds.OrderBy(id => id));
        Assert.NotEqual(originalIds, shuffledIds);
    }
}

public sealed class QuizQuestionHelperTests
{
    [Theory]
    [InlineData("Multiple Choice", true)]
    [InlineData("Multi Select", true)]
    [InlineData("MCQ", false)]
    [InlineData("Single Choice", false)]
    [InlineData("True/False", false)]
    [InlineData("Descriptive", false)]
    public void IsMultiSelectType_MatchesMobileMultiNaming(string typeName, bool expected)
    {
        Assert.Equal(expected, QuizQuestionHelper.IsMultiSelectType(typeName));
    }

    [Theory]
    [InlineData("Single Choice", true)]
    [InlineData("MCQ", true)]
    [InlineData("Multiple Choice", false)]
    [InlineData("True/False", false)]
    public void IsSingleChoiceType_RecognizesAliases(string typeName, bool expected)
    {
        Assert.Equal(expected, QuizQuestionHelper.IsSingleChoiceType(typeName));
    }
}
