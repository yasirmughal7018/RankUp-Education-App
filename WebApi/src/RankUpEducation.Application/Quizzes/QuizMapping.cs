using RankUpEducation.Application.Quizzes;
using RankUpEducation.Contracts.Quizzes;

namespace RankUpEducation.Application.Quizzes;

internal static class QuizMapping
{
    public static QuizSummaryResponse ToSummaryResponse(QuizListItem item, DateTimeOffset now)
    {
        var attemptLimit = item.AllowedAttempts <= 0 ? (short)1 : item.AllowedAttempts;
        var status = item.StartDateTime is null && !string.IsNullOrWhiteSpace(item.LifecycleStatusName)
            ? QuizDisplayStatus.ResolveStaffListStatus(
                item.LifecycleStatusName,
                item.ApprovalStatusName,
                item.TotalQuestions,
                item.HasSubmittedForReview).ToLowerInvariant()
            : QuizStatusCalculator.ResolveListStatus(
                now,
                item.StartDateTime,
                item.EndDateTime,
                item.AttemptCount,
                attemptLimit,
                item.LastSubmittedAt);

        var totalMarks = item.TotalMarks ?? item.TotalQuestions;
        var points = totalMarks;
        var announcedPercent = QuizReviewDisplay.ResolveListAnnouncedPercent(
            now,
            item.LastSubmittedAt,
            item.EndDateTime,
            item.IsReviewDone,
            item.AutoGradedMarks ?? totalMarks,
            totalMarks);
        var scorePercent = announcedPercent == 100 ? item.BestPercentage : null;
        var resultStatus = QuizReviewDisplay.ApplyListResultStatus(
            ResolveResultStatusName(
                item.QuizResultStatusName,
                item.AttemptCount,
                attemptLimit,
                item.BestPercentage,
                item.LastSubmittedAt),
            announcedPercent);

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
            resultStatus,
            scorePercent,
            item.CreatedByName,
            item.SchoolName,
            announcedPercent);
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

        var totalMarks = item.TotalMarks ?? item.TotalQuestions;
        var announcedPercent = QuizReviewDisplay.ResolveListAnnouncedPercent(
            now,
            item.LastSubmittedAt,
            item.EndDateTime,
            item.IsReviewDone,
            item.AutoGradedMarks ?? totalMarks,
            totalMarks);
        var scorePercent = announcedPercent == 100 ? item.BestPercentage : null;
        var resultStatus = QuizReviewDisplay.ApplyListResultStatus(
            ResolveResultStatusName(
                item.QuizResultStatusName,
                item.AttemptCount,
                attemptLimit,
                item.BestPercentage,
                item.LastSubmittedAt),
            announcedPercent);

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
            totalMarks,
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
            resultStatus,
            scorePercent,
            item.RandomQuestionCount ?? item.TotalQuestions,
            announcedPercent);
    }

    private static string ResolveResultStatusName(
        string? storedResultStatusName,
        int attemptCount,
        int attemptLimit,
        short? bestPercentage,
        DateTimeOffset? lastSubmittedAt)
    {
        if (!string.IsNullOrWhiteSpace(storedResultStatusName))
        {
            return storedResultStatusName;
        }

        return QuizStatusCalculator.ResolveResultStatus(
            attemptCount,
            attemptLimit,
            bestPercentage,
            lastSubmittedAt);
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
        QuizReviewDisplay.Visibility visibility,
        string? resultStatusOverride = null)
    {
        var questions = item.Questions.Select(question =>
        {
            var isAutoGraded = QuizQuestionHelper.IsAutoGradedQuestion(question);
            var announced = visibility.IsQuestionAnnounced(isAutoGraded);
            var correctOptions = question.Options.Where(option => option.IsCorrect).ToArray();
            var correctOption = correctOptions.FirstOrDefault();
            var awardedMarks = announced ? question.AwardedMarks : (short)0;
            var showReviewNotes = announced || visibility.ReviewDone;

            return new QuizResultQuestionResponse(
                question.QuestionId,
                question.QuestionText,
                question.Marks,
                awardedMarks,
                announced && question.IsCorrect,
                announced && visibility.ShowExplanations ? question.Explanation : null,
                question.SelectedOptionId,
                announced && visibility.ShowCorrectAnswers ? correctOption?.OptionId : null,
                question.SubmittedText,
                question.SelectedOptionIds,
                announced && visibility.ShowCorrectAnswers
                    ? correctOptions.Select(option => option.OptionId).ToArray()
                    : null,
                string.IsNullOrWhiteSpace(question.QuestionTypeName)
                    ? null
                    : question.QuestionTypeName,
                question.Options
                    .Select(option => new QuizResultOptionResponse(
                        option.OptionId,
                        option.OptionText,
                        option.OptionImageUrl,
                        announced && visibility.ShowCorrectAnswers && option.IsCorrect))
                    .ToArray(),
                ResultPending: !announced,
                TeacherFeedback: showReviewNotes ? question.TeacherFeedback : null,
                ParentFeedback: showReviewNotes ? question.ParentFeedback : null,
                AiFeedback: showReviewNotes ? question.AiFeedback : null);
        }).ToArray();

        var displayedObtained = visibility.ShowScore
            ? (short)Math.Clamp(questions.Sum(question => (int)question.AwardedMarks), 0, short.MaxValue)
            : (short)0;
        var displayedPercentage = visibility.ShowScore && item.TotalMarks > 0
            ? (short)Math.Clamp((int)Math.Round(displayedObtained * 100m / item.TotalMarks), 0, 100)
            : (short)0;
        var reviewAvailable = visibility.ShowCorrectAnswers || visibility.ShowExplanations;

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
            questions,
            visibility.ReviewPending,
            visibility.Mode,
            visibility.AnnouncedPercent,
            visibility.AnnouncesAt);
    }
}
