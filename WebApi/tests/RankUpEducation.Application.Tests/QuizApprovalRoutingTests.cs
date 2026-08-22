using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Tests;

/// <summary>Creator-role routing: SchoolAdmin-created quizzes go to PortalAdmin only.</summary>
public sealed class QuizApprovalRoutingTests
{
    [Theory]
    [InlineData(UserRole.Teacher, true)]
    [InlineData(UserRole.Coordinator, true)]
    [InlineData(UserRole.SchoolAdmin, false)]
    [InlineData(UserRole.CampusAdmin, false)]
    [InlineData(UserRole.Parent, false)]
    [InlineData(UserRole.Tutor, false)]
    [InlineData(UserRole.PortalAdmin, false)]
    public void SchoolOrCampusMayEndorse_OnlyTeacherCoordinator(UserRole creator, bool expected)
    {
        Assert.Equal(expected, QuizApprovalRouting.SchoolOrCampusMayEndorse(creator));
        Assert.Equal(!expected, QuizApprovalRouting.RequiresPortalAdminOnlyReview(creator));
    }

    [Fact]
    public void ResolveCreatorRole_PrefersExclusiveSchoolAdmin()
    {
        Assert.Equal(
            UserRole.SchoolAdmin,
            QuizApprovalRouting.ResolveCreatorRole([UserRole.SchoolAdmin]));
    }

    [Fact]
    public void ResolveCreatorRole_TeacherWinsOverParentWhenBothPresent()
    {
        Assert.Equal(
            UserRole.Teacher,
            QuizApprovalRouting.ResolveCreatorRole([UserRole.Parent, UserRole.Teacher]));
    }
}
