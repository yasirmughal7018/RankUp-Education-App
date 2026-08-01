using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Questions;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

/// <summary>Quiz question links, bank attach, totals recalculation, and copy helpers.</summary>
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
                quizQuestion.ShuffleOptions,
                question.Hint,
                question.Explanation,
                question.EstimatedTimeSeconds
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
            row.Explanation,
            row.EstimatedTimeSeconds,
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
                    answer.MaximumLength,
                    answer.AllowAiReview,
                    answer.AllowTeacherReview))
                .ToArray(),
            row.ShuffleOptions)).ToArray();
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
        // Include pending Added/Modified/Deleted links — AsNoTracking DB queries miss unsaved changes.
        var deletedQuestionIds = _dbContext.ChangeTracker.Entries<QuizQuestion>()
            .Where(entry =>
                entry.Entity.QuizId == quizId && entry.State == EntityState.Deleted)
            .Select(entry => entry.Entity.QuestionId)
            .ToHashSet();

        var marksByQuestionId = new Dictionary<long, short>();
        foreach (var entry in _dbContext.ChangeTracker.Entries<QuizQuestion>())
        {
            if (entry.Entity.QuizId != quizId)
            {
                continue;
            }

            if (entry.State is EntityState.Deleted or EntityState.Detached)
            {
                continue;
            }

            marksByQuestionId[entry.Entity.QuestionId] = entry.Entity.Marks;
        }

        var dbRows = await (
            from link in _dbContext.QuizQuestions.AsNoTracking()
            join question in _dbContext.Questions.AsNoTracking() on link.QuestionId equals question.Id
            where link.QuizId == quizId
            select new
            {
                link.QuestionId,
                link.Marks,
                question.EstimatedTimeSeconds
            })
            .ToListAsync(cancellationToken);

        var estimatedSecondsByQuestionId = new Dictionary<long, short>();
        foreach (var row in dbRows)
        {
            if (deletedQuestionIds.Contains(row.QuestionId))
            {
                continue;
            }

            if (!marksByQuestionId.ContainsKey(row.QuestionId))
            {
                marksByQuestionId[row.QuestionId] = row.Marks;
            }

            estimatedSecondsByQuestionId[row.QuestionId] = row.EstimatedTimeSeconds;
        }

        // Pending attaches may reference questions not yet joined above (link Added, question already saved).
        var missingTimeIds = marksByQuestionId.Keys
            .Where(id => !estimatedSecondsByQuestionId.ContainsKey(id))
            .ToArray();
        if (missingTimeIds.Length > 0)
        {
            var missingTimes = await _dbContext.Questions.AsNoTracking()
                .Where(question => missingTimeIds.Contains(question.Id))
                .Select(question => new { question.Id, question.EstimatedTimeSeconds })
                .ToListAsync(cancellationToken);
            foreach (var row in missingTimes)
            {
                estimatedSecondsByQuestionId[row.Id] = row.EstimatedTimeSeconds;
            }
        }

        // Prefer tracked question edits for estimated time when the entity is loaded.
        foreach (var entry in _dbContext.ChangeTracker.Entries<Question>())
        {
            if (entry.State is EntityState.Deleted or EntityState.Detached)
            {
                continue;
            }

            if (marksByQuestionId.ContainsKey(entry.Entity.Id))
            {
                estimatedSecondsByQuestionId[entry.Entity.Id] = entry.Entity.EstimatedTimeSeconds;
            }
        }

        var count = (short)marksByQuestionId.Count;
        var marks = (short)Math.Clamp(
            marksByQuestionId.Values.Sum(value => (int)value),
            0,
            short.MaxValue);
        var estimatedSeconds = estimatedSecondsByQuestionId
            .Where(pair => marksByQuestionId.ContainsKey(pair.Key))
            .Sum(pair => (int)pair.Value);

        var quiz = await _dbContext.Quizzes.FirstOrDefaultAsync(item => item.Id == quizId, cancellationToken);
        if (quiz is null)
        {
            return;
        }

        short? timeLimitMinutes = null;
        if (estimatedSeconds > 0)
        {
            // Persist whole minutes for legacy attempt budget APIs, but keep ceiling so
            // 70 seconds → 2 minutes still covers the exact Σ duration.
            // Manage UI shows exact "1 min 10 sec" from question times.
            timeLimitMinutes = (short)Math.Clamp(
                (int)Math.Ceiling(estimatedSeconds / 60d),
                1,
                short.MaxValue);
        }

        quiz.SetQuestionTotals(count, marks, timeLimitMinutes);
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
                quizQuestion.DisplayOrder,
                quizQuestion.ShuffleOptions
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
                    answer.MaximumLength,
                    answer.AllowAiReview,
                    answer.AllowTeacherReview))
                .ToArray(),
            row.ShuffleOptions)).ToArray();
    }
}
