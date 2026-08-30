using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Application.Tests;

public sealed class FillBlankAnswerMatchingTests
{
    [Fact]
    public void ExactMatch_CaseSensitiveTrue_IsFullyCorrect()
    {
        var result = Evaluate("London", Accepted("London", isCaseSensitive: true));

        Assert.True(result.IsFullyCorrect);
        Assert.False(result.HasPartialMatch);
        Assert.False(result.NeedsAiReview);
        Assert.False(result.NeedsTeacherReview);
    }

    [Fact]
    public void DifferentCase_CaseSensitiveTrue_IsNotAutomaticallyCorrect()
    {
        var result = Evaluate("london", Accepted("London", isCaseSensitive: true));

        Assert.False(result.IsFullyCorrect);
        Assert.False(result.HasPartialMatch);
    }

    [Fact]
    public void DifferentCase_CaseSensitiveFalse_IsFullMatch()
    {
        var result = Evaluate("london", Accepted("London", isCaseSensitive: false));

        Assert.True(result.IsFullyCorrect);
    }

    [Fact]
    public void ExactAcceptedAnswer_IsAutomaticallyCorrect()
    {
        var result = Evaluate("Paris", Accepted("Paris"));

        Assert.True(result.IsFullyCorrect);
        Assert.False(result.NeedsAiReview);
        Assert.False(result.NeedsTeacherReview);
    }

    [Fact]
    public void NonMatchingAnswer_IsNotAutomaticallyCorrect()
    {
        var result = Evaluate("Berlin", Accepted("Paris"));

        Assert.False(result.IsFullyCorrect);
        Assert.False(result.HasPartialMatch);
    }

    [Fact]
    public void PartialMatch_WhenAllowed_IsNotFullyCorrect()
    {
        var result = Evaluate("Lon", Accepted("London", allowPartialMatch: true));

        Assert.False(result.IsFullyCorrect);
        Assert.True(result.HasPartialMatch);
    }

    [Fact]
    public void PartialMatch_WhenDisallowed_DoesNotMatch()
    {
        var result = Evaluate("Lon", Accepted("London", allowPartialMatch: false));

        Assert.False(result.IsFullyCorrect);
        Assert.False(result.HasPartialMatch);
    }

    [Fact]
    public void PartialContainsAccepted_WhenAllowed_IsNotFullyCorrect()
    {
        var result = Evaluate("Greater London", Accepted("London", allowPartialMatch: true));

        Assert.False(result.IsFullyCorrect);
        Assert.True(result.HasPartialMatch);
    }

    [Fact]
    public void FullMatch_IgnoresPartialFlag_AndSkipsReview()
    {
        var result = Evaluate(
            "London",
            Accepted(
                "London",
                allowPartialMatch: true,
                allowAiReview: true,
                allowTeacherReview: true));

        Assert.True(result.IsFullyCorrect);
        Assert.False(result.HasPartialMatch);
        Assert.False(result.NeedsAiReview);
        Assert.False(result.NeedsTeacherReview);
    }

    [Fact]
    public void NonMatch_AllowAiReview_QueuesAiReviewOnly()
    {
        var result = Evaluate(
            "Berlin",
            Accepted("London", allowAiReview: true, allowTeacherReview: false));

        Assert.False(result.IsFullyCorrect);
        Assert.True(result.NeedsAiReview);
        Assert.False(result.NeedsTeacherReview);
    }

    [Fact]
    public void NonMatch_AllowTeacherReview_QueuesTeacherReview()
    {
        var result = Evaluate(
            "Berlin",
            Accepted("London", allowTeacherReview: true));

        Assert.False(result.IsFullyCorrect);
        Assert.True(result.NeedsTeacherReview);
    }

    [Fact]
    public void DomainEntity_CaseSensitiveRejectsDifferentCase()
    {
        var accepted = new QuestionAcceptedAnswer(
            1,
            "London",
            isCaseSensitive: true,
            allowPartialMatch: false);

        Assert.False(accepted.IsFullMatch("london"));
        Assert.False(accepted.Matches("london"));
        Assert.True(accepted.IsFullMatch("London"));
    }

    [Fact]
    public void DomainEntity_PartialMatchIsNotFullMatch()
    {
        var accepted = new QuestionAcceptedAnswer(
            1,
            "London",
            isCaseSensitive: false,
            allowPartialMatch: true);

        Assert.True(accepted.Matches("Lon"));
        Assert.False(accepted.IsFullMatch("Lon"));
        Assert.True(accepted.IsFullMatch("london"));
    }

    private static FillBlankEvaluation Evaluate(
        string submitted,
        params FillBlankAcceptedAnswer[] answers)
        => FillBlankAnswerMatching.Evaluate(submitted, answers);

    private static FillBlankAcceptedAnswer Accepted(
        string text,
        bool isCaseSensitive = false,
        bool allowPartialMatch = false,
        bool allowAiReview = false,
        bool allowTeacherReview = false)
        => new(
            text,
            isCaseSensitive,
            allowPartialMatch,
            MinimumLength: 0,
            MaximumLength: 1000,
            allowAiReview,
            allowTeacherReview);
}

public sealed class QuizAutoGradeTypeTests
{
    [Theory]
    [InlineData("Single Choice", true)]
    [InlineData("Multiple Choice", true)]
    [InlineData("True/False", true)]
    [InlineData("Matching", true)]
    [InlineData("Ordering", true)]
    [InlineData("Fill in the Blanks", true)]
    [InlineData("Descriptive", false)]
    [InlineData("Essay", false)]
    [InlineData("File Upload", false)]
    public void AutoGradedTypes_KeepPredefinedAnswersAutomatic(string typeName, bool expected)
    {
        Assert.Equal(expected, QuizQuestionHelper.IsAutoGradedType(typeName));
    }

    [Theory]
    [InlineData("Descriptive")]
    [InlineData("Essay")]
    [InlineData("Short Answer")]
    public void EssayTypes_AreNeverAutoGradedAndNeedTeacherReview(string typeName)
    {
        Assert.False(QuizQuestionHelper.IsAutoGradedType(typeName));
        Assert.True(QuizQuestionHelper.IsDescriptiveType(typeName));
        Assert.True(QuizQuestionHelper.IsTeacherReviewType(typeName));
    }
}
