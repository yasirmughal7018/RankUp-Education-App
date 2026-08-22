using RankUpEducation.Application.Lookups;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Tests;

/// <summary>Automated coverage for QZ business rules mappable without a live database.</summary>
public sealed class QuizBusinessScenarioTests
{
    [Fact]
    public void QZ02_TeacherCannotAssignBeforeFinalApproval()
    {
        Assert.False(QuizAssignRules.CanAssignWithApproval(UserRole.Teacher, "Pending"));
        Assert.False(QuizAssignRules.CanAssignWithApproval(UserRole.Teacher, "SchoolApproved"));
        Assert.True(QuizAssignRules.CanAssignWithApproval(UserRole.Teacher, "Approved"));
    }

    [Fact]
    public void QZ02_SchoolAdminMayAssignAtSchoolApproved()
    {
        Assert.True(QuizAssignRules.CanAssignWithApproval(UserRole.SchoolAdmin, "SchoolApproved"));
        Assert.False(QuizAssignRules.CanAssignWithApproval(UserRole.SchoolAdmin, "Pending"));
    }

    [Fact]
    public void QZ03_ParentPrivateUsesApprovedLookupName()
    {
        Assert.True(LookupNames.IsFinalApprovedName("Approved"));
    }

    [Fact]
    public void QZ21_RandomSubsetIsFrozenPerAttemptSelection()
    {
        var pool = Enumerable.Range(1, 8)
            .Select(index => index)
            .ToArray();

        var first = QuizQuestionSelection.SelectForAttempt(
            pool,
            order => (short)order,
            randomQuestionCount: 3,
            shuffleQuestions: false,
            new Random(7)).ToArray();

        var second = QuizQuestionSelection.SelectForAttempt(
            pool,
            order => (short)order,
            randomQuestionCount: 3,
            shuffleQuestions: false,
            new Random(99)).ToArray();

        Assert.Equal(3, first.Length);
        Assert.Equal(3, second.Length);
        Assert.NotEqual(first, second);
    }

    [Fact]
    public void QZ26_SchoolAdminCreatedQuizIsPortalAdminOnly()
    {
        Assert.True(QuizApprovalRouting.RequiresPortalAdminOnlyReview(UserRole.SchoolAdmin));
        Assert.False(QuizApprovalRouting.SchoolOrCampusMayEndorse(UserRole.SchoolAdmin));
        Assert.False(QuizApprovalRouting.RequiresPortalAdminOnlyReview(UserRole.CampusAdmin));
        Assert.True(QuizApprovalRouting.MayEndorse(UserRole.SchoolAdmin, UserRole.CampusAdmin));
        Assert.True(LookupNames.IsPendingApproval(LookupNames.QuizApprovalStatusIds.Pending, "Approval Pending"));
    }

    [Fact]
    public void QZ22_PublishedSchoolQuizzesAreVisibleToAllStaff()
    {
        Assert.True(QuizScopeResolver.CanViewPublishedSchoolCatalog(UserRole.SchoolAdmin));
        Assert.True(QuizScopeResolver.CanViewPublishedSchoolCatalog(UserRole.CampusAdmin));
        Assert.True(QuizScopeResolver.CanViewPublishedSchoolCatalog(UserRole.Teacher));
        Assert.True(QuizScopeResolver.CanViewPublishedSchoolCatalog(UserRole.Coordinator));
        Assert.True(QuizScopeResolver.CanViewPublishedSchoolCatalog(UserRole.PortalAdmin));
        Assert.True(QuizScopeResolver.CanViewPublishedSchoolCatalog(UserRole.Parent));
        Assert.False(QuizScopeResolver.CanViewPublishedSchoolCatalog(UserRole.Student));
    }

    [Fact]
    public void QZ02_CampusAdminCannotAssignUntilPortalApproved()
    {
        Assert.False(QuizAssignRules.CanAssignWithApproval(UserRole.CampusAdmin, "SchoolApproved"));
        Assert.True(QuizAssignRules.CanAssignWithApproval(UserRole.CampusAdmin, "Approved"));
    }
}
