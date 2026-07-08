using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

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
                var answer = answers.FirstOrDefault(row => row.QuizAttemptQuestionId == item.Id);
                return new QuizAttemptQuestionItem(
                    item.Id,
                    item.QuestionId,
                    item.QuestionText,
                    quizQuestions.GetValueOrDefault(item.QuestionId, (short)0),
                    item.DisplayOrder,
                    item.Explanation,
                    answer?.QuestionOptionId,
                    answer?.SubmittedText,
                    answer?.AwardedMarks ?? 0,
                    answer?.IsCorrect ?? false,
                    options
                        .Where(option => option.QuestionId == item.QuestionId)
                        .Select(option => new QuizQuestionOptionItem(
                            option.Id,
                            option.OptionText,
                            option.OptionImageUrl,
                            option.IsCorrect))
                        .ToArray());
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
            .FirstOrDefaultAsync(answer => answer.QuizAttemptQuestionId == attemptQuestionId, cancellationToken);
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
