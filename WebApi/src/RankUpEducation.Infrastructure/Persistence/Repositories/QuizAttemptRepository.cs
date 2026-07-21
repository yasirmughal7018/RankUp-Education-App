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
                question.Explanation,
                attemptQuestion.DisplayOrder
            }).ToListAsync(cancellationToken);

        var questionIds = attemptQuestions.Select(item => item.QuestionId).ToArray();
        var quizQuestions = await _dbContext.QuizQuestions.AsNoTracking()
            .Where(item => item.QuizId == attempt.QuizId && questionIds.Contains(item.QuestionId))
            .ToDictionaryAsync(item => item.QuestionId, item => item.Marks, cancellationToken);

        var answers = await _dbContext.QuizAttemptAnswers.AsNoTracking()
            .Where(answer => attemptQuestions.Select(item => item.Id).Contains(answer.QuizAttemptQuestionId))
            .ToListAsync(cancellationToken);

        var options = await _dbContext.QuestionOptions.AsNoTracking()
            .Where(option => questionIds.Contains(option.QuestionId))
            .ToListAsync(cancellationToken);

        var totalMarks = quizQuestions.Values.DefaultIfEmpty((short)0).Sum(marks => marks);

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

                // Prefer marks/correct from any marked row; for multi-select only the first row holds marks.
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

                return new QuizAttemptQuestionItem(
                    item.Id,
                    item.QuestionId,
                    item.QuestionText,
                    quizQuestions.GetValueOrDefault(item.QuestionId, (short)0),
                    item.DisplayOrder,
                    item.Explanation,
                    selectedOptionIds.Count > 0 ? selectedOptionIds[0] : null,
                    submittedText,
                    (short)awardedMarks,
                    isCorrect,
                    options
                        .Where(option => option.QuestionId == item.QuestionId)
                        .Select(option => new QuizQuestionOptionItem(
                            option.Id,
                            option.OptionText,
                            option.OptionImageUrl,
                            option.IsCorrect))
                        .ToArray(),
                    selectedOptionIds);
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
