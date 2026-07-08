using RankUpEducation.Application.QuizQuestions;
using RankUpEducation.Contracts.QuizQuestions;
using RankUpEducation.Contracts.Quizzes;

namespace RankUpEducation.Application.Quizzes;

internal static class QuizManageMapping
{
    public static ManageQuizResponse ToManageResponse(
        QuizDetailItem detail,
        IReadOnlyList<QuizQuestionItem> questions)
    {
        return new ManageQuizResponse(
            detail.QuizId,
            detail.QuizTitle,
            detail.Description,
            detail.SubjectName,
            detail.GradeName,
            detail.TopicName,
            detail.QuizTypeName,
            detail.DifficultyName,
            detail.LifecycleStatusName,
            detail.ClassId,
            detail.SubjectId,
            detail.TopicId,
            detail.DifficultyLevelId,
            detail.TotalQuestions,
            detail.TotalMarks ?? detail.TotalQuestions,
            detail.TimeLimitMinutes,
            detail.AllowedAttempts,
            QuizStatusCalculator.ParseInstructions(detail.Instructions),
            detail.ShuffleQuestions,
            detail.ShuffleOptions,
            detail.IsReviewRequired,
            detail.CreatedByName,
            detail.SchoolName,
            questions.Select(QuizQuestionMapping.ToQuestionResponse).ToArray());
    }

    public static QuizAssignmentResponse ToAssignmentResponse(QuizAssignmentListItem item)
        => new(
            item.AssignmentId,
            item.StudentId,
            item.StudentName,
            item.StudentGroupId,
            item.StartDateTime,
            item.EndDateTime,
            item.AllowedAttempts,
            item.AttemptCount,
            item.IsReviewDone,
            item.QuizResultStatusName);
}
