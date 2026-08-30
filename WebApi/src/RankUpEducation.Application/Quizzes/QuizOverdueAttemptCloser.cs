using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Lookups;
using RankUpEducation.Application.Notifications;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

public interface IQuizOverdueAttemptCloser
{
    /// <summary>
    /// Auto-evaluates draft answers on InProgress attempts whose assignment window ended,
    /// then marks them AutoSubmitted. Prevents silent Expire-without-score.
    /// </summary>
    Task<int> CloseOverdueInProgressAttemptsAsync(
        DateTimeOffset now,
        CancellationToken cancellationToken);
}

/// <inheritdoc cref="IQuizOverdueAttemptCloser"/>
public sealed class QuizOverdueAttemptCloser : IQuizOverdueAttemptCloser
{
    private readonly IQuizAttemptRepository _attempts;
    private readonly IQuizAssignmentRepository _assignments;
    private readonly IQuizRepository _quizzes;
    private readonly ILookupRepository _lookups;
    private readonly IUnitOfWork _unitOfWork;
    private readonly INotificationService _notifications;

    public QuizOverdueAttemptCloser(
        IQuizAttemptRepository attempts,
        IQuizAssignmentRepository assignments,
        IQuizRepository quizzes,
        ILookupRepository lookups,
        IUnitOfWork unitOfWork,
        INotificationService notifications)
    {
        _attempts = attempts;
        _assignments = assignments;
        _quizzes = quizzes;
        _lookups = lookups;
        _unitOfWork = unitOfWork;
        _notifications = notifications;
    }

    public async Task<int> CloseOverdueInProgressAttemptsAsync(
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var overdue = await _attempts.ListOverdueInProgressAttemptsAsync(now, cancellationToken);
        if (overdue.Count == 0)
        {
            return 0;
        }

        var autoSubmittedStatusId = await _lookups.ResolveLookupIdAsync(
            LookupNames.QuizAttemptStatus,
            "AutoSubmitted",
            fallback: LookupNames.QuizAttemptStatusIds.AutoSubmitted,
            cancellationToken);

        var closed = 0;
        foreach (var (attemptId, quizId, studentId) in overdue)
        {
            var attempt = await _attempts.GetAttemptEntityAsync(attemptId, studentId, cancellationToken);
            if (attempt is null || attempt.StatusId != LookupNames.QuizAttemptStatusIds.InProgress)
            {
                continue;
            }

            var detail = await _attempts.GetAttemptDetailAsync(attemptId, studentId, cancellationToken);
            if (detail is null)
            {
                continue;
            }

            short obtainedMarks = 0;
            var hasSubjectiveAnswers = false;
            var totalMarks = (short)detail.Questions.Sum(question => question.Marks);

            foreach (var question in detail.Questions)
            {
                var selectedOptionIds = question.SelectedOptionIds.Count > 0
                    ? question.SelectedOptionIds
                    : question.SelectedOptionId is long optionId
                        ? [optionId]
                        : Array.Empty<long>();
                var evaluation = QuizAttemptAutoEvaluation.Evaluate(
                    question.QuestionTypeName,
                    question.Marks,
                    selectedOptionIds,
                    question.SubmittedText,
                    question.Options,
                    question.AcceptedAnswers ?? []);
                obtainedMarks += evaluation.AwardedMarks;
                hasSubjectiveAnswers |= evaluation.HasSubjectiveAnswers;
                await ReplaceScoredAnswersAsync(
                    question.AttemptQuestionId,
                    selectedOptionIds,
                    question.SubmittedText,
                    evaluation.AwardedMarks,
                    evaluation.IsCorrect,
                    cancellationToken);
            }

            attempt.MarkSubmitted(
                autoSubmittedStatusId,
                obtainedMarks,
                totalMarks,
                attempt.TimeSpentSeconds);

            var assignment = await _assignments.GetAssignmentEntityAsync(quizId, studentId, cancellationToken);
            if (assignment is not null)
            {
                var resultStatusId = await _lookups.ResolveLookupIdAsync(
                    LookupNames.QuizResultStatus,
                    hasSubjectiveAnswers ? "Under Review" : "Completed",
                    fallback: hasSubjectiveAnswers
                        ? LookupNames.QuizResultStatusIds.UnderReview
                        : LookupNames.QuizResultStatusIds.Completed,
                    cancellationToken);
                assignment.SetResultStatus(resultStatusId);
            }

            closed++;

            if (assignment is not null && assignment.AssignedById != studentId)
            {
                var quizTitle = (await _quizzes.GetDetailForStudentAsync(quizId, studentId, cancellationToken))?.QuizTitle
                    ?? "Quiz";
                await _notifications.CreateAsync(
                    [assignment.AssignedById],
                    "Quiz auto-submitted",
                    $"A student submitted \"{quizTitle}\" (attempt #{attempt.AttemptNumber}).",
                    QuizNotificationCategories.QuizAutoSubmitted,
                    cancellationToken);
            }
        }

        if (closed > 0)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return closed;
    }

    private async Task ReplaceScoredAnswersAsync(
        long attemptQuestionId,
        IReadOnlyList<long> selectedOptionIds,
        string? submittedText,
        short awardedMarks,
        bool isCorrect,
        CancellationToken cancellationToken)
    {
        await _attempts.RemoveAttemptAnswersAsync(attemptQuestionId, cancellationToken);
        if (!selectedOptionIds.Any(id => id > 0) && !submittedText.HasTrimmedText())
        {
            return;
        }

        if (selectedOptionIds.Count == 0)
        {
            var textAnswer = new QuizAttemptAnswer(attemptQuestionId, null, submittedText);
            textAnswer.Mark(awardedMarks, isCorrect);
            await _attempts.AddAttemptAnswersAsync([textAnswer], cancellationToken);
            return;
        }

        var rows = selectedOptionIds
            .Select((optionId, index) =>
            {
                var row = new QuizAttemptAnswer(
                    attemptQuestionId,
                    QuizAnswerSelection.ToPersistedOptionId(optionId),
                    index == 0 ? submittedText : null);
                if (index == 0)
                {
                    row.Mark(awardedMarks, isCorrect);
                }

                return row;
            })
            .ToArray();
        await _attempts.AddAttemptAnswersAsync(rows, cancellationToken);
    }
}
