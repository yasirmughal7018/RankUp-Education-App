using RankUpEducation.Application.Quizzes;
using RankUpEducation.Contracts.Quizzes;

namespace RankUpEducation.Application.Quizzes;

internal static class QuizMapping
{
    public static QuizSummaryResponse ToSummaryResponse(QuizListItem item, DateTimeOffset now)
    {
        var attemptLimit = item.AllowedAttempts <= 0 ? (short)1 : item.AllowedAttempts;
        var status = item.StartDateTime is null && !string.IsNullOrWhiteSpace(item.LifecycleStatusName)
            ? item.LifecycleStatusName.ToLowerInvariant()
            : QuizStatusCalculator.ResolveListStatus(
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

    public static QuizAttemptResultResponse ToAttemptResult(
        QuizAttemptDetailItem item,
        string quizTitle,
        bool reviewAvailable,
        bool maskPendingReview = false,
        string? resultStatusOverride = null)
    {
        var displayedObtained = maskPendingReview ? (short)0 : item.ObtainedMarks;
        var displayedPercentage = maskPendingReview ? (short)0 : item.Percentage;

        return new QuizAttemptResultResponse(
            item.AttemptId,
            item.QuizId,
            quizTitle,
            item.AttemptNumber,
            item.TotalMarks,
            displayedObtained,
            displayedPercentage,
            item.TimeSpentSeconds,
            resultStatusOverride ?? item.StatusName,
            reviewAvailable,
            item.Questions.Select(question =>
            {
                var correctOptions = question.Options.Where(option => option.IsCorrect).ToArray();
                var correctOption = correctOptions.FirstOrDefault();
                var isSubjective = !string.IsNullOrWhiteSpace(question.SubmittedText)
                    && question.SelectedOptionIds.Count == 0
                    && question.SelectedOptionId is null;
                var awardedMarks = maskPendingReview && isSubjective ? (short)0 : question.AwardedMarks;

                return new QuizResultQuestionResponse(
                    question.QuestionId,
                    question.QuestionText,
                    question.Marks,
                    awardedMarks,
                    maskPendingReview && isSubjective ? false : question.IsCorrect,
                    question.Explanation,
                    question.SelectedOptionId,
                    maskPendingReview && isSubjective ? null : correctOption?.OptionId,
                    question.SubmittedText,
                    question.SelectedOptionIds,
                    maskPendingReview && isSubjective
                        ? null
                        : correctOptions.Select(option => option.OptionId).ToArray());
            }).ToArray());
    }
}
