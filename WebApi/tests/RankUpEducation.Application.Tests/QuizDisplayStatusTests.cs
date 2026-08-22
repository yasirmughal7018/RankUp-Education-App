using RankUpEducation.Application.Quizzes;

namespace RankUpEducation.Application.Tests;

public sealed class QuizDisplayStatusTests
{
    [Theory]
    [InlineData("Draft", "Pending", 0, "Draft")]
    [InlineData("Draft", "Pending", 3, "Approval Pending")]
    [InlineData("Draft", "SchoolApproved", 2, "School Approved")]
    [InlineData("Draft", "Approved", 2, "Awaiting Publish")]
    [InlineData("Draft", "Rejected", 2, "Rejected")]
    [InlineData("Published", "Approved", 2, "Published")]
    public void ResolveStaffListStatus_CombinesLifecycleAndApproval(
        string lifecycle,
        string approval,
        short questions,
        string expected)
    {
        var actual = QuizDisplayStatus.ResolveStaffListStatus(lifecycle, approval, questions);
        Assert.Equal(expected, actual);
    }
}
