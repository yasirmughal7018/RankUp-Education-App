using RankUpEducation.Contracts.Quizzes;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Quizzes;

internal static class QuizReviewMapping
{
    public static AttemptReviewResponse ToReviewResponse(
        AttemptReviewDetailItem detail,
        bool canScore,
        UserRole assignedByRole)
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
                question.RequiresReview,
                question.SelectedOptionIds,
                question.AiFeedback,
                question.Options
                    .Select(option => new AttemptReviewOptionResponse(
                        option.OptionId,
                        option.OptionText,
                        option.OptionImageUrl,
                        option.IsCorrect))
                    .ToArray())).ToArray(),
            detail.FocusLossCount,
            detail.ClipboardPasteCount,
            canScore,
            assignedByRole.ToString());
}
