using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Tests;

public sealed class QuizDeleteArchiveRulesTests
{
    [Fact]
    public void EnsureCanDeleteOrArchive_PortalAdmin_AlwaysAllowed()
    {
        var quiz = CreateQuiz(createdBy: "99");
        var scope = new QuizManageScope(UserRole.PortalAdmin, 1, 1, null, null);

        var ex = Record.Exception(() =>
            QuizDeleteArchiveRules.EnsureCanDeleteOrArchive(
                quiz,
                scope,
                lifecycleName: "Published",
                approvalName: "Pending",
                isParentPrivateQuiz: true));

        Assert.Null(ex);
    }

    [Fact]
    public void EnsureCanDeleteOrArchive_ParentQuiz_RejectsOwner()
    {
        var quiz = CreateQuiz(createdBy: "42");
        var scope = new QuizManageScope(UserRole.Parent, 42, 42, null, null);

        var ex = Assert.Throws<ForbiddenAppException>(() =>
            QuizDeleteArchiveRules.EnsureCanDeleteOrArchive(
                quiz,
                scope,
                lifecycleName: "Draft",
                approvalName: "Pending",
                isParentPrivateQuiz: true));

        Assert.Contains("portal admin", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void EnsureCanDeleteOrArchive_TeacherOwner_AllowsDraft()
    {
        var quiz = CreateQuiz(createdBy: "42");
        var scope = new QuizManageScope(UserRole.Teacher, 42, 42, 1, 10);

        var ex = Record.Exception(() =>
            QuizDeleteArchiveRules.EnsureCanDeleteOrArchive(
                quiz,
                scope,
                lifecycleName: "Draft",
                approvalName: "Pending",
                isParentPrivateQuiz: false));

        Assert.Null(ex);
    }

    [Fact]
    public void EnsureCanDeleteOrArchive_TeacherOwner_RejectsPublished()
    {
        var quiz = CreateQuiz(createdBy: "42");
        var scope = new QuizManageScope(UserRole.Teacher, 42, 42, 1, 10);

        var ex = Assert.Throws<ForbiddenAppException>(() =>
            QuizDeleteArchiveRules.EnsureCanDeleteOrArchive(
                quiz,
                scope,
                lifecycleName: "Published",
                approvalName: "Approved",
                isParentPrivateQuiz: false));

        Assert.Contains("portal admin", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void EnsureCanDeleteOrArchive_SchoolAdminOwner_RejectsAssigned()
    {
        var quiz = CreateQuiz(createdBy: "42");
        var scope = new QuizManageScope(UserRole.SchoolAdmin, 42, 42, 1, null);

        var ex = Assert.Throws<ForbiddenAppException>(() =>
            QuizDeleteArchiveRules.EnsureCanDeleteOrArchive(
                quiz,
                scope,
                lifecycleName: "Assigned",
                approvalName: "Approved",
                isParentPrivateQuiz: false));

        Assert.Contains("portal admin", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    private static Quiz CreateQuiz(string createdBy = "42")
    {
        return new Quiz(
            1,
            10,
            "Delete rules quiz",
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
}
