using RankUpEducation.Contracts.Quizzes;

namespace RankUpEducation.Application.Quizzes;

internal static class QuizReviewMapping
{
    public static AttemptReviewResponse ToReviewResponse(AttemptReviewDetailItem detail)
        => new(
            detail.AttemptId,
            detail.QuizId,
            detail.QuizTitle,
            detail.StudentId,
            detail.StudentName,
            detail.AttemptNumber,
            detail.TotalMarks,
            detail.ObtainedMarks,
            detail.Percentage,
            detail.StatusName,
            detail.IsReviewDone,
            detail.SubmittedAt,
            detail.Questions.Select(question => new AttemptReviewQuestionResponse(
                question.QuestionId,
                question.QuestionText,
                question.QuestionTypeName,
                question.MaxMarks,
                question.AwardedMarks,
                question.IsCorrect,
                question.SelectedOptionId,
                question.SubmittedText,
                question.ParentFeedback,
                question.RequiresReview)).ToArray());
}
