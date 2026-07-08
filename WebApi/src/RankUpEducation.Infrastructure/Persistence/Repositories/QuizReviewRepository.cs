using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

public sealed class QuizReviewRepository : IQuizReviewRepository
{
    private readonly RankUpDbContext _dbContext;
    private readonly ILookupRepository _lookups;

    public QuizReviewRepository(RankUpDbContext dbContext, ILookupRepository lookups)
    {
        _dbContext = dbContext;
        _lookups = lookups;
    }

    public async Task<IReadOnlyList<QuizMonitoringStudentItem>> ListMonitoringForQuizAsync(
        long quizId,
        long creatorUserId,
        CancellationToken cancellationToken)
    {
        var creatorKey = creatorUserId.ToString();
        var quizExists = await _dbContext.Quizzes.AsNoTracking()
            .AnyAsync(
                quiz => quiz.Id == quizId && quiz.CreatedByName == creatorKey && quiz.IsActive && !quiz.IsDeleted,
                cancellationToken);

        if (!quizExists)
        {
            return Array.Empty<QuizMonitoringStudentItem>();
        }

        var assignments = await _dbContext.QuizAssignments.AsNoTracking()
            .Where(assignment => assignment.QuizId == quizId)
            .OrderBy(assignment => assignment.StudentId)
            .ToListAsync(cancellationToken);

        var studentNames = await QuizQueryHelper.LoadStudentNamesAsync(
            _dbContext,
            assignments.Select(item => item.StudentId),
            cancellationToken);

        var items = new List<QuizMonitoringStudentItem>();
        foreach (var assignment in assignments)
        {
            var stats = await QuizQueryHelper.GetAttemptStatsAsync(
                _dbContext,
                quizId,
                assignment.StudentId,
                cancellationToken);
            items.Add(new QuizMonitoringStudentItem(
                assignment.StudentId,
                studentNames.GetValueOrDefault(assignment.StudentId, $"Student {assignment.StudentId}"),
                assignment.Id,
                stats.AttemptCount,
                stats.BestPercentage,
                assignment.IsReviewDone,
                stats.LastSubmittedAt,
                assignment.StartDateTime,
                assignment.EndDateTime));
        }

        return items;
    }

    public async Task<IReadOnlyList<PendingReviewItem>> ListPendingReviewsForCreatorAsync(
        long creatorUserId,
        CancellationToken cancellationToken)
    {
        var creatorKey = creatorUserId.ToString();
        var submittedStatusIds = await QuizQueryHelper.ResolveStatusIdsByNamesAsync(
            _dbContext,
            "QuizAttemptStatus",
            QuizLookupNames.SubmittedAttemptStatusNames,
            cancellationToken);

        if (submittedStatusIds.Count == 0)
        {
            return Array.Empty<PendingReviewItem>();
        }

        var rows = await (
            from attempt in _dbContext.QuizAttempts.AsNoTracking()
            join quiz in _dbContext.Quizzes.AsNoTracking() on attempt.QuizId equals quiz.Id
            join assignment in _dbContext.QuizAssignments.AsNoTracking()
                on new { attempt.QuizId, attempt.StudentId } equals new { assignment.QuizId, assignment.StudentId }
            where quiz.CreatedByName == creatorKey
                && quiz.IsActive
                && !quiz.IsDeleted
                && quiz.IsReviewRequired
                && !assignment.IsReviewDone
                && submittedStatusIds.Contains(attempt.StatusId)
                && attempt.SubmittedDate != default
            orderby attempt.SubmittedDate descending
            select new
            {
                QuizId = quiz.Id,
                quiz.QuizTitle,
                AttemptId = attempt.Id,
                attempt.StudentId,
                attempt.NumberOfQuestionAttempt,
                attempt.SubmittedDate,
                attempt.ObtainedMarks
            }).ToListAsync(cancellationToken);

        if (rows.Count == 0)
        {
            return Array.Empty<PendingReviewItem>();
        }

        var studentNames = await QuizQueryHelper.LoadStudentNamesAsync(
            _dbContext,
            rows.Select(row => row.StudentId),
            cancellationToken);

        var items = new List<PendingReviewItem>();
        foreach (var row in rows)
        {
            var totalMarks = await _dbContext.QuizQuestions.AsNoTracking()
                .Where(link => link.QuizId == row.QuizId)
                .SumAsync(link => (short?)link.Marks, cancellationToken) ?? 0;

            items.Add(new PendingReviewItem(
                row.QuizId,
                row.QuizTitle,
                row.AttemptId,
                row.StudentId,
                studentNames.GetValueOrDefault(row.StudentId, $"Student {row.StudentId}"),
                row.NumberOfQuestionAttempt,
                row.SubmittedDate,
                (short)totalMarks,
                row.ObtainedMarks));
        }

        return items;
    }

    public async Task<AttemptReviewDetailItem?> GetAttemptReviewDetailAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken)
    {
        var attempt = await _dbContext.QuizAttempts.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == attemptId && item.QuizId == quizId, cancellationToken);

        if (attempt is null)
        {
            return null;
        }

        var quiz = await _dbContext.Quizzes.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == quizId && item.IsActive && !item.IsDeleted, cancellationToken);

        if (quiz is null)
        {
            return null;
        }

        var assignment = await _dbContext.QuizAssignments.AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.QuizId == quizId && item.StudentId == attempt.StudentId,
                cancellationToken);

        var statusName = await _lookups.GetLookupNameAsync(attempt.StatusId, cancellationToken);
        var attemptQuestions = await (
            from attemptQuestion in _dbContext.QuizAttemptQuestions.AsNoTracking()
            join question in _dbContext.Questions.AsNoTracking() on attemptQuestion.QuestionId equals question.Id
            where attemptQuestion.QuizAttemptId == attemptId
            orderby attemptQuestion.DisplayOrder
            select new
            {
                attemptQuestion.Id,
                attemptQuestion.QuestionId,
                question.QuestionText,
                question.QuestionTypeId,
                attemptQuestion.QuizReviewId
            }).ToListAsync(cancellationToken);

        var questionIds = attemptQuestions.Select(item => item.QuestionId).ToArray();
        var quizQuestions = await _dbContext.QuizQuestions.AsNoTracking()
            .Where(item => item.QuizId == quizId && questionIds.Contains(item.QuestionId))
            .ToDictionaryAsync(item => item.QuestionId, item => item.Marks, cancellationToken);

        var typeNames = await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => attemptQuestions.Select(item => item.QuestionTypeId).Contains(lookup.Id))
            .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);

        var answers = await _dbContext.QuizAttemptAnswers.AsNoTracking()
            .Where(answer => attemptQuestions.Select(item => item.Id).Contains(answer.QuizAttemptQuestionId))
            .ToListAsync(cancellationToken);

        var reviewIds = attemptQuestions
            .Where(item => item.QuizReviewId is not null)
            .Select(item => item.QuizReviewId!.Value)
            .ToArray();

        var reviews = reviewIds.Length == 0
            ? new Dictionary<long, string>()
            : await _dbContext.QuizReviews.AsNoTracking()
                .Where(review => reviewIds.Contains(review.Id))
                .ToDictionaryAsync(
                    review => review.Id,
                    review => !string.IsNullOrWhiteSpace(review.ParentReviewComment)
                        ? review.ParentReviewComment!
                        : review.TeacherReviewComment ?? string.Empty,
                    cancellationToken);

        var totalMarks = quizQuestions.Values.DefaultIfEmpty((short)0).Sum(marks => marks);
        var studentName = await _dbContext.Users.AsNoTracking()
            .Where(user => user.Id == attempt.StudentId)
            .Select(user => user.FullName)
            .FirstOrDefaultAsync(cancellationToken)
            ?? $"Student {attempt.StudentId}";

        return new AttemptReviewDetailItem(
            attempt.Id,
            attempt.QuizId,
            quiz.QuizTitle,
            attempt.StudentId,
            studentName,
            attempt.NumberOfQuestionAttempt,
            (short)totalMarks,
            attempt.ObtainedMarks,
            attempt.Percentage,
            statusName,
            assignment?.IsReviewDone ?? false,
            attempt.SubmittedDate,
            attemptQuestions.Select(item =>
            {
                var questionAnswers = answers
                    .Where(row => row.QuizAttemptQuestionId == item.Id)
                    .ToArray();
                var selectedOptionIds = QuizAnswerSelection.AggregateSelectedOptionIds(
                    questionAnswers.Select(row => row.QuestionOptionId));
                var primaryAnswer = questionAnswers.FirstOrDefault();
                var marked = questionAnswers.FirstOrDefault(row => row.AwardedMarks > 0 || row.IsCorrect)
                    ?? primaryAnswer;
                var typeName = typeNames.GetValueOrDefault(item.QuestionTypeId, "Multiple Choice");
                var requiresReview = QuizQuestionHelper.IsDescriptiveType(typeName)
                    || (selectedOptionIds.Count == 0
                        && !string.IsNullOrWhiteSpace(primaryAnswer?.SubmittedText));

                string? feedback = null;
                if (item.QuizReviewId is not null)
                {
                    reviews.TryGetValue(item.QuizReviewId.Value, out feedback);
                }

                var submittedText = questionAnswers
                    .Select(row => row.SubmittedText)
                    .FirstOrDefault(text => !string.IsNullOrWhiteSpace(text));

                return new AttemptReviewQuestionItem(
                    item.Id,
                    item.QuestionId,
                    item.QuestionText,
                    typeName,
                    quizQuestions.GetValueOrDefault(item.QuestionId, (short)0),
                    marked?.AwardedMarks ?? 0,
                    marked?.IsCorrect ?? false,
                    selectedOptionIds.Count > 0 ? selectedOptionIds[0] : null,
                    submittedText,
                    string.IsNullOrWhiteSpace(feedback) ? null : feedback,
                    requiresReview,
                    item.QuizReviewId,
                    selectedOptionIds);
            }).ToArray());
    }

    public Task<QuizReview?> GetQuestionReviewEntityAsync(long reviewId, CancellationToken cancellationToken)
    {
        return _dbContext.QuizReviews.FirstOrDefaultAsync(review => review.Id == reviewId, cancellationToken);
    }

    public async Task AddReviewAsync(QuizReview review, CancellationToken cancellationToken)
    {
        await _dbContext.QuizReviews.AddAsync(review, cancellationToken);
    }
}
