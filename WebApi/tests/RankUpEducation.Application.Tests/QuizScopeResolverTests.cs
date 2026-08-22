using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Tests;

public sealed class QuizScopeResolverTests
{
    [Fact]
    public void RequireManageScope_AllowsCampusAdminWithCampusContext()
    {
        var scope = QuizScopeResolver.RequireManageScope(
            new TestCurrentUser("CampusAdmin", userId: 7, schoolId: 1, campusId: 10));

        Assert.Equal(UserRole.CampusAdmin, scope.Role);
        Assert.Equal(1, scope.SchoolId);
        Assert.Equal(10, scope.CampusId);
    }

    [Fact]
    public void ResolveOwnerListFilter_SchoolAdmin_UsesSchoolNotCreator()
    {
        var scope = new QuizManageScope(UserRole.SchoolAdmin, 5, 5, 2, null);

        var (creatorUserId, schoolId) = QuizScopeResolver.ResolveOwnerListFilter(scope);

        Assert.Null(creatorUserId);
        Assert.Equal(2, schoolId);
    }

    [Fact]
    public void ResolveOwnerListFilter_CampusAdmin_UsesSchoolNotCreator()
    {
        var scope = new QuizManageScope(UserRole.CampusAdmin, 7, 7, 1, 10);

        var (creatorUserId, schoolId) = QuizScopeResolver.ResolveOwnerListFilter(scope);

        Assert.Null(creatorUserId);
        Assert.Equal(1, schoolId);
    }

    [Fact]
    public void RequireApprovalScope_AllowsCampusAdminWithCampusContext()
    {
        var scope = QuizScopeResolver.RequireApprovalScope(
            new TestCurrentUser("CampusAdmin", userId: 7, schoolId: 1, campusId: 10));

        Assert.Equal(UserRole.CampusAdmin, scope.Role);
        Assert.Equal(1, scope.SchoolId);
        Assert.Equal(10, scope.CampusId);
    }

    [Fact]
    public void RequireApprovalScope_RejectsTeacher()
    {
        var ex = Assert.Throws<ForbiddenAppException>(() =>
            QuizScopeResolver.RequireApprovalScope(new TestCurrentUser("Teacher", 9, 1, 10)));

        Assert.Contains("administrators", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void RequireAssignScope_AllowsSchoolAdminWithoutCampus()
    {
        var scope = QuizScopeResolver.RequireAssignScope(
            new TestCurrentUser("SchoolAdmin", userId: 5, schoolId: 2));

        Assert.Equal(UserRole.SchoolAdmin, scope.Role);
        Assert.Equal(2, scope.SchoolId);
    }

    [Fact]
    public void EnsureOwnsQuiz_CampusAdmin_MatchesSchoolAndCampus()
    {
        var quiz = CreateQuiz(schoolId: 1, campusId: 10, createdBy: "99");
        var scope = new QuizManageScope(UserRole.CampusAdmin, 7, 7, 1, 10);

        var ex = Record.Exception(() => QuizScopeResolver.EnsureOwnsQuiz(quiz, scope));

        Assert.Null(ex);
    }

    [Fact]
    public void EnsureOwnsQuiz_CampusAdmin_RejectsOtherCampus()
    {
        var quiz = CreateQuiz(schoolId: 1, campusId: 11, createdBy: "99");
        var scope = new QuizManageScope(UserRole.CampusAdmin, 7, 7, 1, 10);

        var ex = Assert.Throws<ForbiddenAppException>(() =>
            QuizScopeResolver.EnsureOwnsQuiz(quiz, scope));

        Assert.Contains("campus", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void EnsureOwnsQuiz_SchoolAdmin_AllowsSameSchoolAnyOwner()
    {
        var quiz = CreateQuiz(schoolId: 1, campusId: 10, createdBy: "99");
        var scope = new QuizManageScope(UserRole.SchoolAdmin, 5, 5, 1, null);

        var ex = Record.Exception(() => QuizScopeResolver.EnsureOwnsQuiz(quiz, scope));

        Assert.Null(ex);
    }

    [Fact]
    public void EnsureOwnsQuiz_Teacher_RequiresOwnershipAndCampus()
    {
        var owned = CreateQuiz(schoolId: 1, campusId: 10, createdBy: "42");
        var scope = new QuizManageScope(UserRole.Teacher, 42, 42, 1, 10);

        var ex = Record.Exception(() => QuizScopeResolver.EnsureOwnsQuiz(owned, scope));
        Assert.Null(ex);

        var otherTeacherQuiz = CreateQuiz(schoolId: 1, campusId: 10, createdBy: "43");
        Assert.Throws<ForbiddenAppException>(() =>
            QuizScopeResolver.EnsureOwnsQuiz(otherTeacherQuiz, scope));
    }

    [Fact]
    public void IsQuizOwner_MatchesCreatedByUserIdString()
    {
        var quiz = CreateQuiz(createdBy: "42");
        var scope = new QuizManageScope(UserRole.Teacher, 42, 42, 1, 10);

        Assert.True(QuizScopeResolver.IsQuizOwner(quiz, scope));
    }

    [Fact]
    public void EnsureCanEditQuizSettings_AllowsPortalAdminAndOwner()
    {
        var quiz = CreateQuiz(createdBy: "99");
        var portalScope = new QuizManageScope(UserRole.PortalAdmin, 1, 1, null, null);
        var ownerScope = new QuizManageScope(UserRole.Teacher, 99, 99, 1, 10);

        Assert.Null(Record.Exception(() =>
            QuizScopeResolver.EnsureCanEditQuizSettings(quiz, portalScope)));
        Assert.Null(Record.Exception(() =>
            QuizScopeResolver.EnsureCanEditQuizSettings(quiz, ownerScope)));
    }

    [Fact]
    public void EnsureCanEditQuizSettings_RejectsSchoolAdminWhenNotOwner()
    {
        var quiz = CreateQuiz(createdBy: "99");
        var scope = new QuizManageScope(UserRole.SchoolAdmin, 5, 5, 1, null);

        var ex = Assert.Throws<ForbiddenAppException>(() =>
            QuizScopeResolver.EnsureCanEditQuizSettings(quiz, scope));

        Assert.Contains("owner", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    private static Quiz CreateQuiz(int? schoolId = 1, int? campusId = 10, string createdBy = "42")
    {
        return new Quiz(
            schoolId,
            campusId,
            "Scope test quiz",
            "Description",
            quizTypeId: 1,
            classId: 1,
            subjectId: 1,
            topicId: null,
            difficultyLevelId: null,
            totalQuestions: 3,
            instructions: "Instructions",
            createdBy,
            approvalStatusId: 40,
            lifecycleStatusId: 60);
    }

    private sealed class TestCurrentUser : ICurrentUserService
    {
        public TestCurrentUser(
            string role,
            long userId,
            int? schoolId = null,
            int? campusId = null,
            long? profileId = null)
        {
            Role = role;
            UserId = userId;
            SchoolId = schoolId;
            CampusId = campusId;
            ProfileId = profileId ?? userId;
        }

        public long? UserId { get; }
        public string? Role { get; }
        public long? ProfileId { get; }
        public int? SchoolId { get; }
        public int? CampusId { get; }
    }
}
