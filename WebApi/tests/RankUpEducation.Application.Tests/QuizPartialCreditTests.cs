using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Application.Tests;

public sealed class QuizPartialCreditTests
{
    [Fact]
    public void MultiSelect_FullyCorrect_AwardsAllMarks()
    {
        var result = QuizAnswerSelection.ScoreMultiSelect([1, 2], [2, 1], 2);
        Assert.True(result.IsFullyCorrect);
        Assert.Equal(2, result.CorrectComponents);
        Assert.Equal(2, result.TotalComponents);
        Assert.Equal((short)100, result.CorrectPercentage);
        Assert.Equal((short)2, result.AwardedMarks);
    }

    [Fact]
    public void MultiSelect_PartiallyCorrect_AwardsHalfOfTwo()
    {
        var result = QuizAnswerSelection.ScoreMultiSelect([1], [1, 2], 2);
        Assert.False(result.IsFullyCorrect);
        Assert.Equal(1, result.CorrectComponents);
        Assert.Equal(2, result.TotalComponents);
        Assert.Equal((short)50, result.CorrectPercentage);
        Assert.Equal((short)1, result.AwardedMarks);
    }

    [Fact]
    public void MultiSelect_CompletelyIncorrect_AwardsZero()
    {
        var result = QuizAnswerSelection.ScoreMultiSelect([9], [1, 2], 2);
        Assert.Equal(0, result.CorrectComponents);
        Assert.Equal((short)0, result.AwardedMarks);
    }

    [Fact]
    public void Matching_FullyCorrect_AwardsAllMarks()
    {
        var result = QuizAnswerSelection.ScoreMatching([10, 20, 30, 40], [10, 20, 30, 40], 4);
        Assert.True(result.IsFullyCorrect);
        Assert.Equal((short)4, result.AwardedMarks);
        Assert.Equal(4, result.TotalComponents);
    }

    [Fact]
    public void Matching_PartiallyCorrect_AwardsThreeOfFour()
    {
        var result = QuizAnswerSelection.ScoreMatching([10, 20, 30, 99], [10, 20, 30, 40], 4);
        Assert.False(result.IsFullyCorrect);
        Assert.Equal(3, result.CorrectComponents);
        Assert.Equal(4, result.TotalComponents);
        Assert.Equal((short)75, result.CorrectPercentage);
        Assert.Equal((short)3, result.AwardedMarks);
    }

    [Fact]
    public void Ordering_FullyCorrect_AwardsAllMarks()
    {
        var result = QuizAnswerSelection.ScoreOrdering([1, 2, 3, 4], [1, 2, 3, 4], 4);
        Assert.True(result.IsFullyCorrect);
        Assert.Equal((short)4, result.AwardedMarks);
    }

    [Fact]
    public void Ordering_PartiallyCorrect_AwardsThreeOfFour()
    {
        var result = QuizAnswerSelection.ScoreOrdering([1, 2, 3, 9], [1, 2, 3, 4], 4);
        Assert.Equal(3, result.CorrectComponents);
        Assert.Equal((short)3, result.AwardedMarks);
    }

    [Fact]
    public void DecimalCalculatedMarks_FloorsOnePointFiveToOne()
    {
        var result = QuizPartialCredit.Award(3, 1, 2);
        Assert.Equal((short)50, result.CorrectPercentage);
        Assert.Equal((short)1, result.AwardedMarks);
    }

    [Fact]
    public void Floor_OnePointNine_BecomesOne()
    {
        var result = QuizPartialCredit.Award(19, 1, 10);
        Assert.Equal((short)1, result.AwardedMarks);
    }

    [Fact]
    public void Floor_OnePointOne_BecomesOne()
    {
        var result = QuizPartialCredit.Award(11, 1, 10);
        Assert.Equal((short)1, result.AwardedMarks);
    }

    [Fact]
    public void Floor_TwoPointNine_BecomesTwo()
    {
        var result = QuizPartialCredit.Award(29, 1, 10);
        Assert.Equal((short)2, result.AwardedMarks);
    }

    [Fact]
    public void Ordering_FiveMarksThreeOfFour_FloorsToThree()
    {
        var result = QuizAnswerSelection.ScoreOrdering([1, 2, 3, 9], [1, 2, 3, 4], 5);
        Assert.Equal(3, result.CorrectComponents);
        Assert.Equal(4, result.TotalComponents);
        Assert.Equal((short)3, result.AwardedMarks);
        Assert.False(result.IsFullyCorrect);
    }

    [Fact]
    public void Matching_CompletelyIncorrect_AwardsZero()
    {
        var result = QuizAnswerSelection.ScoreMatching([9, 8, 7, 6], [1, 2, 3, 4], 4);
        Assert.Equal(0, result.CorrectComponents);
        Assert.Equal((short)0, result.AwardedMarks);
    }

    [Fact]
    public void ExactIntegerMarks_RemainUnchanged()
    {
        var result = QuizPartialCredit.Award(4, 3, 4);
        Assert.Equal((short)3, result.AwardedMarks);
        Assert.Equal((short)75, result.CorrectPercentage);
    }

    [Fact]
    public void Matching_FiveMarksThreeOfFour_FloorsToThree()
    {
        var result = QuizAnswerSelection.ScoreMatching([1, 2, 3, 9], [1, 2, 3, 4], 5);
        Assert.Equal((short)3, result.AwardedMarks);
    }

    [Fact]
    public void ZeroCorrectComponents_ProduceZeroMarks()
    {
        var result = QuizPartialCredit.Award(8, 0, 4);
        Assert.Equal((short)0, result.AwardedMarks);
        Assert.Equal((short)0, result.CorrectPercentage);
        Assert.False(result.IsFullyCorrect);
    }

    [Fact]
    public void FillInTheBlanks_FullMatchStillAutoCorrects()
    {
        var result = FillBlankAnswerMatching.Evaluate(
            "London",
            [new FillBlankAcceptedAnswer("London", false, false, 0, 1000, false, false)]);

        Assert.True(result.IsFullyCorrect);
        Assert.False(result.NeedsTeacherReview);
        Assert.False(result.NeedsAiReview);
    }

    [Fact]
    public void FillInTheBlanks_PartialMatchIsNotFullyCorrect()
    {
        var result = FillBlankAnswerMatching.Evaluate(
            "Lon",
            [new FillBlankAcceptedAnswer("London", false, true, 0, 1000, true, true)]);

        Assert.False(result.IsFullyCorrect);
        Assert.True(result.HasPartialMatch);
        Assert.True(result.NeedsAiReview);
        Assert.True(result.NeedsTeacherReview);
    }

    [Fact]
    public void Essay_IsNotAutoGraded()
    {
        Assert.False(QuizQuestionHelper.IsAutoGradedType("Essay"));
        Assert.True(QuizQuestionHelper.IsTeacherReviewType("Essay"));
    }
}
