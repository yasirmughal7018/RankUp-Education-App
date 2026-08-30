using RankUpEducation.Application.Quizzes;

namespace RankUpEducation.Application.Tests;

public sealed class QuizAttemptAutoEvaluationTests
{
    [Fact]
    public void SingleChoice_CorrectOption_AwardsFullMarks()
    {
        var result = QuizAttemptAutoEvaluation.Evaluate(
            "Single Choice",
            2,
            [10],
            null,
            [
                new QuizQuestionOptionItem(10, "A", null, true),
                new QuizQuestionOptionItem(11, "B", null, false)
            ],
            []);

        Assert.True(result.IsCorrect);
        Assert.Equal((short)2, result.AwardedMarks);
    }

    [Fact]
    public void FillBlank_ExactMatch_IsAutomaticallyCorrect()
    {
        var result = QuizAttemptAutoEvaluation.Evaluate(
            "Fill in the Blanks",
            3,
            [],
            "London",
            [],
            [Accepted("London")]);

        Assert.True(result.IsCorrect);
        Assert.Equal((short)3, result.AwardedMarks);
        Assert.False(result.HasSubjectiveAnswers);
        Assert.False(result.NeedsAiReview);
    }

    [Fact]
    public void FillBlank_DifferentCase_WhenCaseSensitive_IsNotCorrect()
    {
        var result = QuizAttemptAutoEvaluation.Evaluate(
            "Fill in the Blanks",
            3,
            [],
            "london",
            [],
            [Accepted("London", isCaseSensitive: true)]);

        Assert.False(result.IsCorrect);
        Assert.Equal((short)0, result.AwardedMarks);
    }

    [Fact]
    public void FillBlank_NonMatch_WithTeacherReview_IsSubjective()
    {
        var result = QuizAttemptAutoEvaluation.Evaluate(
            "Fill in the Blanks",
            3,
            [],
            "Paris",
            [],
            [Accepted("London", allowTeacherReview: true, allowAiReview: true)]);

        Assert.False(result.IsCorrect);
        Assert.True(result.HasSubjectiveAnswers);
        Assert.True(result.NeedsAiReview);
    }

    [Fact]
    public void Essay_IsNeverAutomaticallyCorrect()
    {
        var result = QuizAttemptAutoEvaluation.Evaluate(
            "Essay",
            5,
            [],
            "A long written answer",
            [],
            [Accepted("Model answer")]);

        Assert.False(result.IsCorrect);
        Assert.Equal((short)0, result.AwardedMarks);
        Assert.True(result.HasSubjectiveAnswers);
        Assert.True(result.NeedsAiReview);
    }

    [Fact]
    public void Matching_UnmatchedMiddlePair_AwardsTwoOfThree()
    {
        var result = QuizAttemptAutoEvaluation.Evaluate(
            "Matching",
            3,
            [10, 0, 30],
            null,
            [
                new QuizQuestionOptionItem(1, "L1", null, false),
                new QuizQuestionOptionItem(2, "L2", null, false),
                new QuizQuestionOptionItem(3, "L3", null, false),
                new QuizQuestionOptionItem(10, "R1", null, true),
                new QuizQuestionOptionItem(20, "R2", null, true),
                new QuizQuestionOptionItem(30, "R3", null, true)
            ],
            []);

        Assert.False(result.IsCorrect);
        Assert.Equal((short)2, result.AwardedMarks);
    }

    [Fact]
    public void Matching_ThreeOfFourOnFiveMarks_FloorsToThree()
    {
        var result = QuizAttemptAutoEvaluation.Evaluate(
            "Matching",
            5,
            [10, 20, 30, 99],
            null,
            [
                new QuizQuestionOptionItem(1, "L1", null, false),
                new QuizQuestionOptionItem(2, "L2", null, false),
                new QuizQuestionOptionItem(3, "L3", null, false),
                new QuizQuestionOptionItem(4, "L4", null, false),
                new QuizQuestionOptionItem(10, "R1", null, true),
                new QuizQuestionOptionItem(20, "R2", null, true),
                new QuizQuestionOptionItem(30, "R3", null, true),
                new QuizQuestionOptionItem(40, "R4", null, true)
            ],
            []);

        Assert.False(result.IsCorrect);
        Assert.Equal((short)3, result.AwardedMarks);
    }

    [Fact]
    public void MultipleChoice_Partial_AwardsFlooredMarks()
    {
        var result = QuizAttemptAutoEvaluation.Evaluate(
            "Multiple Choice",
            2,
            [1],
            null,
            [
                new QuizQuestionOptionItem(1, "A", null, true),
                new QuizQuestionOptionItem(2, "B", null, true),
                new QuizQuestionOptionItem(3, "C", null, false)
            ],
            []);

        Assert.False(result.IsCorrect);
        Assert.Equal((short)1, result.AwardedMarks);
    }

    [Fact]
    public void MultipleChoice_ThreeMarks_OneCorrectAndOneWrong_AwardsOne()
    {
        var result = QuizAttemptAutoEvaluation.Evaluate(
            "Multiple Choice",
            3,
            [107, 109],
            null,
            [
                new QuizQuestionOptionItem(107, "2", null, true),
                new QuizQuestionOptionItem(108, "5", null, true),
                new QuizQuestionOptionItem(109, "6", null, false),
                new QuizQuestionOptionItem(110, "4", null, false)
            ],
            []);

        Assert.False(result.IsCorrect);
        Assert.Equal((short)1, result.AwardedMarks);
    }

    private static QuestionAcceptedAnswerScoreItem Accepted(
        string text,
        bool isCaseSensitive = false,
        bool allowTeacherReview = false,
        bool allowAiReview = false)
        => new(1, text, isCaseSensitive, false, text.ToLowerInvariant(), 0, 1000, allowAiReview, allowTeacherReview);
}
