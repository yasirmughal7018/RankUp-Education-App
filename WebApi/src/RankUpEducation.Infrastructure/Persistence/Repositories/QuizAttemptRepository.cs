using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

/// <summary>Attempt lifecycle, answer persistence, and scored attempt detail projections.</summary>
public sealed class QuizAttemptRepository : IQuizAttemptRepository
{
    private readonly RankUpDbContext _dbContext;
    private readonly ILookupRepository _lookups;

    public QuizAttemptRepository(RankUpDbContext dbContext, ILookupRepository lookups)
    {
        _dbContext = dbContext;
        _lookups = lookups;
    }

    public async Task AddAttemptAsync(QuizAttempt attempt, CancellationToken cancellationToken)
    {
        await _dbContext.QuizAttempts.AddAsync(attempt, cancellationToken);
    }

    public async Task AddAttemptQuestionsAsync(
        IReadOnlyList<QuizAttemptQuestion> attemptQuestions,
        CancellationToken cancellationToken)
    {
        await _dbContext.QuizAttemptQuestions.AddRangeAsync(attemptQuestions, cancellationToken);
    }

    public async Task AddAttemptQuestionOptionsAsync(
        IReadOnlyList<QuizAttemptQuestionOption> options,
        CancellationToken cancellationToken)
    {
        await _dbContext.QuizAttemptQuestionOptions.AddRangeAsync(options, cancellationToken);
    }

    public async Task AddAttemptAcceptedAnswersAsync(
        IReadOnlyList<QuizAttemptAcceptedAnswer> answers,
        CancellationToken cancellationToken)
    {
        await _dbContext.QuizAttemptAcceptedAnswers.AddRangeAsync(answers, cancellationToken);
    }

    public async Task AddAttemptAnswersAsync(
        IReadOnlyList<QuizAttemptAnswer> answers,
        CancellationToken cancellationToken)
    {
        await _dbContext.QuizAttemptAnswers.AddRangeAsync(answers, cancellationToken);
    }

    public Task<QuizAttempt?> GetInProgressAttemptAsync(
        long quizId,
        long studentId,
        short inProgressStatusId,
        CancellationToken cancellationToken)
    {
        return _dbContext.QuizAttempts
            .Where(attempt =>
                attempt.QuizId == quizId &&
                attempt.StudentId == studentId &&
                attempt.StatusId == inProgressStatusId)
            .OrderByDescending(attempt => attempt.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<QuizAttemptDetailItem?> GetAttemptDetailAsync(
        long attemptId,
        long studentId,
        CancellationToken cancellationToken)
    {
        var attempt = await _dbContext.QuizAttempts.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == attemptId && item.StudentId == studentId, cancellationToken);

        if (attempt is null)
        {
            return null;
        }

        var statusName = await _lookups.GetLookupNameAsync(attempt.StatusId, cancellationToken);
        var attemptQuestions = await _dbContext.QuizAttemptQuestions.AsNoTracking()
            .Where(attemptQuestion => attemptQuestion.QuizAttemptId == attemptId)
            .OrderBy(attemptQuestion => attemptQuestion.DisplayOrder)
            .ToListAsync(cancellationToken);

        var attemptQuestionIds = attemptQuestions.Select(item => item.Id).ToArray();
        var answers = await _dbContext.QuizAttemptAnswers.AsNoTracking()
            .Where(answer => attemptQuestionIds.Contains(answer.QuizAttemptQuestionId))
            .ToListAsync(cancellationToken);

        var frozenOptions = await _dbContext.QuizAttemptQuestionOptions.AsNoTracking()
            .Where(option => attemptQuestionIds.Contains(option.QuizAttemptQuestionId))
            .OrderBy(option => option.DisplayOrder)
            .ToListAsync(cancellationToken);

        var frozenAccepted = await _dbContext.QuizAttemptAcceptedAnswers.AsNoTracking()
            .Where(answer => attemptQuestionIds.Contains(answer.QuizAttemptQuestionId))
            .ToListAsync(cancellationToken);

        // Fallback for pre-freeze attempts: live bank options.
        var legacyQuestionIds = attemptQuestions
            .Where(item => string.IsNullOrWhiteSpace(item.QuestionText))
            .Select(item => item.QuestionId)
            .Distinct()
            .ToArray();
        var legacyOptions = legacyQuestionIds.Length == 0
            ? []
            : await _dbContext.QuestionOptions.AsNoTracking()
                .Where(option => legacyQuestionIds.Contains(option.QuestionId))
                .ToListAsync(cancellationToken);
        var legacyQuestions = legacyQuestionIds.Length == 0
            ? new Dictionary<long, (string Text, string? Explanation)>()
            : await _dbContext.Questions.AsNoTracking()
                .Where(question => legacyQuestionIds.Contains(question.Id))
                .ToDictionaryAsync(
                    question => question.Id,
                    question => (question.QuestionText, question.Explanation),
                    cancellationToken);

        var totalMarks = attemptQuestions.Sum(item => (int)item.Marks);

        return new QuizAttemptDetailItem(
            attempt.Id,
            attempt.QuizId,
            attempt.StudentId,
            attempt.NumberOfQuestionAttempt,
            attempt.StatusId,
            statusName,
            (short)totalMarks,
            attempt.ObtainedMarks,
            attempt.Percentage,
            attempt.TimeSpentSeconds,
            attempt.StartedDate,
            attempt.SubmittedDate,
            attemptQuestions.Select(item =>
            {
                var questionAnswers = answers
                    .Where(row => row.QuizAttemptQuestionId == item.Id)
                    .ToArray();
                var selectedOptionIds = QuizAnswerSelection.AggregateSelectedOptionIds(
                    questionAnswers.Select(row => row.QuestionOptionId));
                var primaryAnswer = questionAnswers.FirstOrDefault();
                var awardedMarks = questionAnswers.Sum(row => (int)row.AwardedMarks);
                var isCorrect = questionAnswers.Any(row => row.IsCorrect)
                    && awardedMarks > 0;

                if (questionAnswers.Length > 1)
                {
                    var marked = questionAnswers.FirstOrDefault(row => row.AwardedMarks > 0 || row.IsCorrect)
                        ?? primaryAnswer;
                    awardedMarks = marked?.AwardedMarks ?? 0;
                    isCorrect = marked?.IsCorrect ?? false;
                }

                var submittedText = questionAnswers
                    .Select(row => row.SubmittedText)
                    .FirstOrDefault(text => !string.IsNullOrWhiteSpace(text));

                var snapshotOptions = frozenOptions
                    .Where(option => option.QuizAttemptQuestionId == item.Id)
                    .Select(option => new QuizQuestionOptionItem(
                        option.SourceOptionId ?? option.Id,
                        option.OptionText,
                        option.OptionImageUrl,
                        option.IsCorrect))
                    .ToArray();

                if (snapshotOptions.Length == 0)
                {
                    snapshotOptions = legacyOptions
                        .Where(option => option.QuestionId == item.QuestionId)
                        .Select(option => new QuizQuestionOptionItem(
                            option.Id,
                            option.OptionText,
                            option.OptionImageUrl,
                            option.IsCorrect))
                        .ToArray();
                }

                var questionText = item.QuestionText;
                var explanation = item.Explanation;
                if (string.IsNullOrWhiteSpace(questionText)
                    && legacyQuestions.TryGetValue(item.QuestionId, out var legacy))
                {
                    questionText = legacy.Item1;
                    explanation ??= legacy.Explanation;
                }

                var accepted = frozenAccepted
                    .Where(answer => answer.QuizAttemptQuestionId == item.Id)
                    .Select(answer => new QuestionAcceptedAnswerScoreItem(
                        answer.Id,
                        answer.AnswerText,
                        answer.IsCaseSensitive,
                        answer.AllowPartialMatch,
                        answer.NormalizedAnswer,
                        answer.MinimumLength,
                        answer.MaximumLength,
                        answer.AllowAiReview,
                        answer.AllowTeacherReview))
                    .ToArray();

                return new QuizAttemptQuestionItem(
                    item.Id,
                    item.QuestionId,
                    questionText,
                    item.Marks,
                    item.DisplayOrder,
                    explanation,
                    selectedOptionIds.Count > 0 ? selectedOptionIds[0] : null,
                    submittedText,
                    (short)awardedMarks,
                    isCorrect,
                    snapshotOptions,
                    selectedOptionIds,
                    item.IsMarkedForReview,
                    item.QuestionTypeName,
                    item.Hint,
                    item.EstimatedTimeSeconds,
                    item.TimeSpentSeconds,
                    accepted);
            }).ToArray());
    }

    public Task<QuizAttempt?> GetAttemptEntityAsync(
        long attemptId,
        long studentId,
        CancellationToken cancellationToken)
    {
        return _dbContext.QuizAttempts
            .FirstOrDefaultAsync(item => item.Id == attemptId && item.StudentId == studentId, cancellationToken);
    }

    public Task<int> CountAttemptsAsync(long quizId, long studentId, CancellationToken cancellationToken)
    {
        return _dbContext.QuizAttempts.CountAsync(
            attempt => attempt.QuizId == quizId && attempt.StudentId == studentId,
            cancellationToken);
    }

    public Task<QuizAttempt?> GetAttemptEntityByIdAsync(long attemptId, long quizId, CancellationToken cancellationToken)
    {
        return _dbContext.QuizAttempts
            .FirstOrDefaultAsync(item => item.Id == attemptId && item.QuizId == quizId, cancellationToken);
    }

    public Task<QuizAttemptQuestion?> GetAttemptQuestionEntityAsync(
        long attemptId,
        long questionId,
        CancellationToken cancellationToken)
    {
        return _dbContext.QuizAttemptQuestions
            .FirstOrDefaultAsync(
                item => item.QuizAttemptId == attemptId && item.QuestionId == questionId,
                cancellationToken);
    }

    public Task<QuizAttemptAnswer?> GetAttemptAnswerEntityAsync(
        long attemptQuestionId,
        CancellationToken cancellationToken)
    {
        return _dbContext.QuizAttemptAnswers
            .OrderBy(answer => answer.Id)
            .FirstOrDefaultAsync(answer => answer.QuizAttemptQuestionId == attemptQuestionId, cancellationToken);
    }

    public async Task<IReadOnlyList<QuizAttemptAnswer>> GetAttemptAnswerEntitiesAsync(
        long attemptQuestionId,
        CancellationToken cancellationToken)
    {
        return await _dbContext.QuizAttemptAnswers
            .Where(answer => answer.QuizAttemptQuestionId == attemptQuestionId)
            .OrderBy(answer => answer.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task RemoveAttemptAnswersAsync(long attemptQuestionId, CancellationToken cancellationToken)
    {
        var answers = await _dbContext.QuizAttemptAnswers
            .Where(answer => answer.QuizAttemptQuestionId == attemptQuestionId)
            .ToListAsync(cancellationToken);
        _dbContext.QuizAttemptAnswers.RemoveRange(answers);
    }

    public async Task<bool> IsSubmittedAttemptAsync(long attemptId, CancellationToken cancellationToken)
    {
        var submittedStatusIds = await QuizQueryHelper.ResolveStatusIdsByNamesAsync(
            _dbContext,
            "QuizAttemptStatus",
            QuizLookupNames.SubmittedAttemptStatusNames,
            cancellationToken);

        if (submittedStatusIds.Count == 0)
        {
            return false;
        }

        return await _dbContext.QuizAttempts.AsNoTracking()
            .AnyAsync(
                attempt => attempt.Id == attemptId && submittedStatusIds.Contains(attempt.StatusId),
                cancellationToken);
    }
}
