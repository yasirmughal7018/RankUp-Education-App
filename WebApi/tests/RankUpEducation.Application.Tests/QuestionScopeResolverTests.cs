using RankUpEducation.Application.Questions;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Application.Tests;

public sealed class QuestionScopeResolverTests
{
    [Fact]
    public void CanViewQuestion_ParentCreator_IsHiddenFromCampusAdmin()
    {
        var scope = new QuestionManageScope(UserRole.CampusAdmin, 99, 1, 10);

        var canView = QuestionScopeResolver.CanViewQuestion(
            createdByUserId: 42,
            createdByRole: UserRole.Parent,
            visibilityLevel: QuestionVisibilityLevels.None,
            questionSchoolId: 1,
            questionCampusId: 10,
            scope);

        Assert.False(canView);
    }

    [Fact]
    public void CanViewQuestion_ParentCreator_IsVisibleToPortalAdmin()
    {
        var scope = new QuestionManageScope(UserRole.PortalAdmin, 1, null, null);

        var canView = QuestionScopeResolver.CanViewQuestion(
            createdByUserId: 42,
            createdByRole: UserRole.Parent,
            visibilityLevel: QuestionVisibilityLevels.None,
            questionSchoolId: null,
            questionCampusId: null,
            scope);

        Assert.True(canView);
    }

    [Fact]
    public void IsCreatorVisibleToCampusAdmin_ExcludesParent()
    {
        Assert.False(QuestionScopeResolver.IsCreatorVisibleToCampusAdmin(UserRole.Parent));
        Assert.True(QuestionScopeResolver.IsCreatorVisibleToCampusAdmin(UserRole.Teacher));
    }
}
