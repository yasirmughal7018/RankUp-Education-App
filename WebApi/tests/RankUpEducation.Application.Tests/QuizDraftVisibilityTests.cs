using RankUpEducation.Application.Quizzes;

namespace RankUpEducation.Application.Tests;

public sealed class QuizDraftVisibilityTests
{
    [Theory]
    [InlineData("Pending", false, false)]
    [InlineData("Pending", true, true)]
    [InlineData("SchoolApproved", false, true)]
    [InlineData("Approved", false, true)]
    [InlineData("Rejected", false, true)]
    public void NonOwner_SeesDraftOnlyAfterSubmitOrPipeline(
        string approval,
        bool hasSubmittedForReview,
        bool expected)
    {
        Assert.Equal(
            expected,
            QuizDraftVisibility.IsVisibleToNonOwner(approval, hasSubmittedForReview));
    }
}
