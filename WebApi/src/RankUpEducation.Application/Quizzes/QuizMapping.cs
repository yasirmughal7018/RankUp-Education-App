using RankUpEducation.Application.Quizzes;
using RankUpEducation.Contracts.Quizzes;

namespace RankUpEducation.Application.Quizzes;

internal static class QuizMapping
{
    public static QuizSummaryResponse ToSummaryResponse(QuizListItem item, DateTimeOffset now)
    {
        var attemptLimit = item.AllowedAttempts <= 0 ? (short)1 : item.AllowedAttempts;
        var status = QuizStatusCalculator.ResolveListStatus(
            now,
            item.StartDateTime,
            item.EndDateTime,
            item.AttemptCount,
            attemptLimit,
            item.LastSubmittedAt);

        var totalMarks = item.TotalMarks ?? item.TotalQuestions;
        var points = totalMarks;

        return new QuizSummaryResponse(
            item.QuizId,
            item.QuizTitle,
            item.SubjectName,
            item.GradeName,
            item.TotalQuestions,
            points,
            status,
            item.Description,
            item.QuizTypeName,
            item.TopicName,
            item.DifficultyName,
            totalMarks,
            item.TimeLimitMinutes,
            attemptLimit,
            item.StartDateTime,
            item.EndDateTime,
            item.LastSubmittedAt,
            QuizStatusCalculator.ParseInstructions(item.Instructions),
            item.IsReviewRequired,
            QuizStatusCalculator.ResolveResultStatus(
                item.AttemptCount,
                attemptLimit,
                item.BestPercentage,
                item.LastSubmittedAt),
            item.BestPercentage,
            item.CreatedByName,
            item.SchoolName);
    }

    public static QuizDetailResponse ToDetailResponse(QuizDetailItem item, DateTimeOffset now)
    {
        var attemptLimit = item.AllowedAttempts <= 0 ? (short)1 : item.AllowedAttempts;
        var status = QuizStatusCalculator.ResolveListStatus(
            now,
            item.StartDateTime,
            item.EndDateTime,
            item.AttemptCount,
            attemptLimit,
            item.LastSubmittedAt);

        return new QuizDetailResponse(
            item.QuizId,
            item.QuizTitle,
            item.Description,
            item.SubjectName,
            item.GradeName,
            item.TopicName,
            item.QuizTypeName,
            item.DifficultyName,
            item.TotalQuestions,
            item.TotalMarks ?? item.TotalQuestions,
            item.TimeLimitMinutes,
            attemptLimit,
            (short)item.AttemptCount,
            item.StartDateTime,
            item.EndDateTime,
            status,
            QuizStatusCalculator.ParseInstructions(item.Instructions),
            item.ShuffleQuestions,
            item.ShuffleOptions,
            false,
            item.IsReviewRequired,
            item.CreatedByName,
            item.SchoolName,
            QuizStatusCalculator.ResolveResultStatus(
                item.AttemptCount,
                attemptLimit,
                item.BestPercentage,
                item.LastSubmittedAt),
            item.BestPercentage);
    }

    public static QuizQuestionForAttemptResponse ToAttemptQuestion(QuizQuestionItem item, bool revealCorrectAnswers)
    {
        _ = revealCorrectAnswers;

        return new QuizQuestionForAttemptResponse(
            item.QuestionId,
            item.QuestionText,
            item.QuestionTypeName,
            item.Marks,
            item.DisplayOrder,
            item.Hint,
            item.Options
                .Select(option => new QuizOptionResponse(
                    option.OptionId,
                    option.OptionText,
                    option.OptionImageUrl))
                .ToArray());
    }

    public static QuizAttemptResultResponse ToAttemptResult(QuizAttemptDetailItem item, string quizTitle, bool reviewAvailable)
    {
        return new QuizAttemptResultResponse(
            item.AttemptId,
            item.QuizId,
            quizTitle,
            item.AttemptNumber,
            item.TotalMarks,
            item.ObtainedMarks,
            item.Percentage,
            item.TimeSpentSeconds,
            item.StatusName,
            reviewAvailable,
            item.Questions.Select(question =>
            {
                var correctOption = question.Options.FirstOrDefault(option => option.IsCorrect);
                return new QuizResultQuestionResponse(
                    question.QuestionId,
                    question.QuestionText,
                    question.Marks,
                    question.AwardedMarks,
                    question.IsCorrect,
                    question.Explanation,
                    question.SelectedOptionId,
                    correctOption?.OptionId,
                    question.SubmittedText);
            }).ToArray());
    }
}
