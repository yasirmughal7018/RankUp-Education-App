using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

public sealed class QuizQuestionRepository : IQuizQuestionRepository
{
    private readonly RankUpDbContext _dbContext;

    public QuizQuestionRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<QuizQuestionItem>> GetQuizQuestionsAsync(
        long quizId,
        CancellationToken cancellationToken,
        bool includeInactive = false)
    {
        var rows = await (
            from quizQuestion in _dbContext.QuizQuestions.AsNoTracking()
            join question in _dbContext.Questions.AsNoTracking() on quizQuestion.QuestionId equals question.Id
            where quizQuestion.QuizId == quizId && (includeInactive || question.IsActive)
            orderby quizQuestion.DisplayOrder
            select new
            {
                quizQuestion.QuestionId,
                question.QuestionText,
                question.QuestionTypeId,
                quizQuestion.Marks,
                quizQuestion.DisplayOrder,
                question.Hint
            }).ToListAsync(cancellationToken);

        if (rows.Count == 0)
        {
            return Array.Empty<QuizQuestionItem>();
        }

        var questionIds = rows.Select(row => row.QuestionId).ToArray();
        var options = await _dbContext.QuestionOptions.AsNoTracking()
            .Where(option => questionIds.Contains(option.QuestionId) && option.IsActive)
            .ToListAsync(cancellationToken);

        var acceptedAnswers = await _dbContext.QuestionAcceptedAnswers.AsNoTracking()
            .Where(answer => questionIds.Contains(answer.QuestionId))
            .ToListAsync(cancellationToken);

        var lookupIds = rows.Select(row => row.QuestionTypeId).Distinct().ToArray();

        var lookupNames = await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => lookupIds.Contains(lookup.Id))
            .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);

        return rows.Select(row => new QuizQuestionItem(
            row.QuestionId,
            row.QuestionText,
            row.QuestionTypeId,
            lookupNames.GetValueOrDefault(row.QuestionTypeId, "Multiple Choice"),
            row.Marks,
            row.DisplayOrder,
            row.Hint,
            options
                .Where(option => option.QuestionId == row.QuestionId)
                .Select(option => new QuizQuestionOptionItem(
                    option.Id,
                    option.OptionText,
                    option.OptionImageUrl,
                    option.IsCorrect))
                .ToArray(),
            acceptedAnswers
                .Where(answer => answer.QuestionId == row.QuestionId)
                .Select(answer => new QuestionAcceptedAnswerScoreItem(
                    answer.Id,
                    answer.AnswerText,
                    answer.IsCaseSensitive,
                    answer.AllowPartialMatch,
                    answer.NormalizedAnswer,
                    answer.MinimumLength,
                    answer.MaximumLength))
                .ToArray())).ToArray();
    }

    public async Task AddQuizQuestionAsync(QuizQuestion quizQuestion, CancellationToken cancellationToken)
    {
        await _dbContext.QuizQuestions.AddAsync(quizQuestion, cancellationToken);
    }

    public Task<QuizQuestion?> GetQuizQuestionLinkAsync(long quizId, long questionId, CancellationToken cancellationToken)
    {
        return _dbContext.QuizQuestions.FirstOrDefaultAsync(
            link => link.QuizId == quizId && link.QuestionId == questionId,
            cancellationToken);
    }

    public Task RemoveQuizQuestionLinkAsync(QuizQuestion link, CancellationToken cancellationToken)
    {
        _dbContext.QuizQuestions.Remove(link);
        return Task.CompletedTask;
    }

    public async Task RecalculateQuizTotalsAsync(long quizId, CancellationToken cancellationToken)
    {
        var totals = await _dbContext.QuizQuestions.AsNoTracking()
            .Where(link => link.QuizId == quizId)
            .GroupBy(link => link.QuizId)
            .Select(group => new
            {
                Count = (short)group.Count(),
                Marks = (short)group.Sum(item => item.Marks)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var quiz = await _dbContext.Quizzes.FirstOrDefaultAsync(item => item.Id == quizId, cancellationToken);
        if (quiz is null)
        {
            return;
        }

        quiz.SetQuestionTotals(totals?.Count ?? 0, totals?.Marks ?? 0);
    }

    public async Task<IReadOnlyList<QuizQuestionCopyItem>> GetQuizQuestionsForCopyAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var rows = await (
            from quizQuestion in _dbContext.QuizQuestions.AsNoTracking()
            join question in _dbContext.Questions.AsNoTracking() on quizQuestion.QuestionId equals question.Id
            where quizQuestion.QuizId == quizId && question.IsActive
            orderby quizQuestion.DisplayOrder
            select new
            {
                question.Id,
                question.QuestionText,
                question.QuestionTypeId,
                question.ClassId,
                question.SubjectId,
                question.TopicId,
                question.DifficultyLevel,
                question.EstimatedTimeSeconds,
                quizQuestion.Marks,
                question.Hint,
                question.Explanation,
                quizQuestion.DisplayOrder
            }).ToListAsync(cancellationToken);

        if (rows.Count == 0)
        {
            return Array.Empty<QuizQuestionCopyItem>();
        }

        var questionIds = rows.Select(row => row.Id).ToArray();
        var options = await _dbContext.QuestionOptions.AsNoTracking()
            .Where(option => questionIds.Contains(option.QuestionId) && option.IsActive)
            .ToListAsync(cancellationToken);

        var acceptedAnswers = await _dbContext.QuestionAcceptedAnswers.AsNoTracking()
            .Where(answer => questionIds.Contains(answer.QuestionId))
            .ToListAsync(cancellationToken);

        return rows.Select(row => new QuizQuestionCopyItem(
            row.Id,
            row.QuestionText,
            row.QuestionTypeId,
            row.ClassId,
            row.SubjectId,
            row.TopicId,
            row.DifficultyLevel,
            row.EstimatedTimeSeconds,
            row.Marks,
            row.Hint,
            row.Explanation,
            row.DisplayOrder,
            options
                .Where(option => option.QuestionId == row.Id)
                .Select(option => new QuizQuestionOptionItem(
                    option.Id,
                    option.OptionText,
                    option.OptionImageUrl,
                    option.IsCorrect))
                .ToArray(),
            acceptedAnswers
                .Where(answer => answer.QuestionId == row.Id)
                .Select(answer => new QuestionAcceptedAnswerScoreItem(
                    answer.Id,
                    answer.AnswerText,
                    answer.IsCaseSensitive,
                    answer.AllowPartialMatch,
                    answer.NormalizedAnswer,
                    answer.MinimumLength,
                    answer.MaximumLength))
                .ToArray())).ToArray();
    }
}
