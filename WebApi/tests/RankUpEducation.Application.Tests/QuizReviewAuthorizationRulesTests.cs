using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Tests;

public sealed class QuizReviewAuthorizationRulesTests
{
    [Theory]
    [InlineData(UserRole.Parent, true)]
    [InlineData(UserRole.Teacher, false)]
    [InlineData(UserRole.Coordinator, false)]
    [InlineData(UserRole.CampusAdmin, false)]
    [InlineData(UserRole.SchoolAdmin, false)]
    [InlineData(UserRole.PortalAdmin, true)]
    public void ParentAssigned_OnlyParentAndPortalAdminCanScore(UserRole caller, bool expected)
    {
        Assert.Equal(expected, QuizReviewAuthorizationRules.CanScore(caller, UserRole.Parent));
    }

    [Theory]
    [InlineData(UserRole.Teacher, true)]
    [InlineData(UserRole.Coordinator, true)]
    [InlineData(UserRole.CampusAdmin, true)]
    [InlineData(UserRole.SchoolAdmin, true)]
    [InlineData(UserRole.PortalAdmin, true)]
    [InlineData(UserRole.Parent, false)]
    public void TeacherAssigned_StaffCanScoreParentCannot(UserRole caller, bool expected)
    {
        Assert.Equal(expected, QuizReviewAuthorizationRules.CanScore(caller, UserRole.Teacher));
    }

    [Fact]
    public void CampusAdminAssigned_ParentCannotScore()
    {
        Assert.False(QuizReviewAuthorizationRules.CanScore(UserRole.Parent, UserRole.CampusAdmin));
        Assert.True(QuizReviewAuthorizationRules.CanScore(UserRole.Teacher, UserRole.CampusAdmin));
        Assert.True(QuizReviewAuthorizationRules.CanScore(UserRole.SchoolAdmin, UserRole.CampusAdmin));
    }

    [Fact]
    public void UnknownAssignedByRole_TreatedAsStaffAssigned()
    {
        Assert.False(QuizReviewAuthorizationRules.CanScore(UserRole.Parent, (UserRole)0));
        Assert.True(QuizReviewAuthorizationRules.CanScore(UserRole.Teacher, (UserRole)0));
    }
}
