using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Tests;

/// <summary>Domain lifecycle tests for publish → approve/reject workflow.</summary>
public sealed class QuizWorkflowEntityTests
{
    [Fact]
    public void SubmitForApproval_RequiresAtLeastOneQuestion()
    {
        var quiz = CreateQuiz(totalQuestions: 0);

        var ex = Assert.Throws<BusinessRuleException>(() =>
            quiz.SubmitForApproval(61, 40));

        Assert.Contains("at least one question", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void SubmitForApproval_ClearsRejectionAndQueuesPending()
    {
        var quiz = CreateQuiz();
        quiz.Reject(43, "Needs more questions");

        quiz.SubmitForApproval(61, 40);

        Assert.Equal((short)61, quiz.LifecycleStatusId);
        Assert.Equal((short)40, quiz.ApprovalStatusId);
        Assert.Null(quiz.ApprovedBy);
        Assert.Null(quiz.RejectionReason);
    }

    [Fact]
    public void Approve_SchoolTier_SetsApprovedByAndClearsRejection()
    {
        var quiz = CreateQuiz();
        quiz.SubmitForApproval(61, 40);

        quiz.Approve(41, "8");

        Assert.Equal((short)41, quiz.ApprovalStatusId);
        Assert.Equal("8", quiz.ApprovedBy);
        Assert.Null(quiz.RejectionReason);
    }

    [Fact]
    public void Approve_PortalFinal_SetsApprovedStatus()
    {
        var quiz = CreateQuiz();
        quiz.Approve(41, "8");
        quiz.Approve(42, "1");

        Assert.Equal((short)42, quiz.ApprovalStatusId);
        Assert.Equal("1", quiz.ApprovedBy);
    }

    [Fact]
    public void Reject_RequiresReason()
    {
        var quiz = CreateQuiz();

        Assert.Throws<BusinessRuleException>(() => quiz.Reject(43, "   "));
    }

    [Fact]
    public void Reject_TruncatesLongReason()
    {
        var quiz = CreateQuiz();
        var reason = new string('x', 1200);

        quiz.Reject(43, reason);

        Assert.NotNull(quiz.RejectionReason);
        Assert.Equal(1000, quiz.RejectionReason!.Length);
        Assert.Null(quiz.ApprovedBy);
    }

    [Fact]
    public void Publish_ParentOrPortal_SetsLifecycleAndApprovalTogether()
    {
        var quiz = CreateQuiz();

        quiz.Publish(61, 42, "3");

        Assert.Equal((short)61, quiz.LifecycleStatusId);
        Assert.Equal((short)42, quiz.ApprovalStatusId);
        Assert.Equal("3", quiz.ApprovedBy);
    }

    private static Quiz CreateQuiz(short totalQuestions = 2)
    {
        return new Quiz(
            schoolId: 1,
            schoolCampusId: 10,
            quizTitle: "Workflow quiz",
            description: "Desc",
            quizTypeId: 1,
            classId: 1,
            subjectId: 1,
            topicId: null,
            difficultyLevelId: null,
            totalQuestions: totalQuestions,
            instructions: "Read all questions.",
            createdBy: "42",
            approvalStatusId: 40,
            lifecycleStatusId: 60);
    }
}
