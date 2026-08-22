using RankUpEducation.Application.Quizzes;

namespace RankUpEducation.Application.Tests;

public sealed class QuizDisplayStatusTests
{
    [Theory]
    [InlineData("Draft", "Pending", 0, false, "Draft")]
    [InlineData("Draft", "Pending", 3, false, "Draft")]
    [InlineData("Draft", "Pending", 3, true, "Approval Pending")]
    [InlineData("Draft", "SchoolApproved", 2, false, "School Approved")]
    [InlineData("Draft", "Approved", 2, false, "Awaiting Publish")]
    [InlineData("Draft", "Rejected", 2, false, "Rejected")]
    [InlineData("Published", "Approved", 2, false, "Published")]
    public void ResolveStaffListStatus_CombinesLifecycleAndApproval(
        string lifecycle,
        string approval,
        short questions,
        bool hasSubmittedForReview,
        string expected)
    {
        var actual = QuizDisplayStatus.ResolveStaffListStatus(
            lifecycle,
            approval,
            questions,
            hasSubmittedForReview);
        Assert.Equal(expected, actual);
    }
}
