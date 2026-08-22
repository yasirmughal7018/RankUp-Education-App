using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Tests;

public sealed class QuizEditRequestRulesTests
{
    [Theory]
    [InlineData("Draft", "Pending", false)]
    [InlineData("Draft", "Rejected", false)]
    [InlineData("Draft", "SchoolApproved", true)]
    [InlineData("Draft", "Approved", true)]
    [InlineData("Published", "Approved", true)]
    [InlineData("Assigned", "Approved", true)]
    [InlineData("Archived", "Approved", true)]
    public void IsLockedForOwnerEdit_AfterApprovalOrPublish(
        string lifecycle,
        string approval,
        bool expected)
    {
        Assert.Equal(expected, QuizEditRequestRules.IsLockedForOwnerEdit(lifecycle, approval));
    }

    [Fact]
    public void TeacherAndCoordinator_RouteToSchoolCampusAndPortal()
    {
        Assert.True(QuizEditRequestRules.RoutesToSchoolAndCampusApprovers(UserRole.Teacher));
        Assert.True(QuizEditRequestRules.RoutesToSchoolAndCampusApprovers(UserRole.Coordinator));
        Assert.False(QuizEditRequestRules.RoutesToSchoolAndCampusApprovers(UserRole.SchoolAdmin));
        Assert.False(QuizEditRequestRules.RoutesToSchoolAndCampusApprovers(UserRole.Parent));
        Assert.False(QuizEditRequestRules.RoutesToSchoolAndCampusApprovers(UserRole.Tutor));
        Assert.False(QuizEditRequestRules.RoutesToSchoolAndCampusApprovers(UserRole.CampusAdmin));
        Assert.False(QuizEditRequestRules.RoutesToSchoolAndCampusApprovers(UserRole.PortalAdmin));
    }

    [Fact]
    public void Reviewers_ArePortalSchoolAndCampusAdmins()
    {
        Assert.True(QuizEditRequestRules.CanReviewEditRequests(UserRole.PortalAdmin));
        Assert.True(QuizEditRequestRules.CanReviewEditRequests(UserRole.SchoolAdmin));
        Assert.True(QuizEditRequestRules.CanReviewEditRequests(UserRole.CampusAdmin));
        Assert.False(QuizEditRequestRules.CanReviewEditRequests(UserRole.Teacher));
        Assert.False(QuizEditRequestRules.CanReviewEditRequests(UserRole.Coordinator));
        Assert.False(QuizEditRequestRules.CanReviewEditRequests(UserRole.Parent));
        Assert.False(QuizEditRequestRules.CanReviewEditRequests(UserRole.Tutor));
    }
}
