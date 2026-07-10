using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Questions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

public sealed class QuestionRepository : IQuestionRepository
{
    private readonly RankUpDbContext _dbContext;

    public QuestionRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddQuestionAsync(Question question, CancellationToken cancellationToken)
    {
        await _dbContext.Questions.AddAsync(question, cancellationToken);
    }

    public Task<Question?> GetQuestionEntityAsync(long questionId, CancellationToken cancellationToken)
    {
        return _dbContext.Questions.FirstOrDefaultAsync(
            question => question.Id == questionId && question.IsActive,
            cancellationToken);
    }

    public Task<Question?> GetQuestionEntityForManageAsync(long questionId, CancellationToken cancellationToken)
    {
        return _dbContext.Questions
            .Include(question => question.Options)
            .FirstOrDefaultAsync(question => question.Id == questionId, cancellationToken);
    }

    public async Task<IReadOnlyList<QuestionListItem>> ListQuestionsAsync(
        long? createdByUserId,
        bool? isActive,
        short? subjectId,
        short? classId,
        bool pendingApprovalOnly,
        bool eligibleForQuizOnly,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Questions.AsNoTracking().AsQueryable();

        if (isActive.HasValue)
        {
            query = query.Where(question => question.IsActive == isActive.Value);
        }

        if (subjectId.HasValue)
        {
            query = query.Where(question => question.SubjectId == subjectId.Value);
        }

        if (classId.HasValue)
        {
            query = query.Where(question => question.ClassId == classId.Value);
        }

        if (eligibleForQuizOnly)
        {
            query = query.Where(question =>
                question.IsActive
                && question.IsAiApproved
                && question.ApprovedBy != null
                && question.ApprovedBy != "");
        }

        var rows = await query
            .OrderByDescending(question => question.ModifiedDate)
            .ThenByDescending(question => question.Id)
            .Select(question => new
            {
                question.Id,
                question.QuestionText,
                question.QuestionTypeId,
                question.StatusId,
                question.Marks,
                question.IsActive,
                question.CreatedBy,
                question.ApprovedBy,
                question.IsAiApproved,
                question.CreatedDate,
                question.ModifiedDate
            })
            .ToListAsync(cancellationToken);

        if (rows.Count == 0)
        {
            return Array.Empty<QuestionListItem>();
        }

        var lookupIds = rows.Select(row => row.QuestionTypeId)
            .Concat(rows.Select(row => row.StatusId))
            .Distinct()
            .ToArray();

        var lookupNames = await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => lookupIds.Contains(lookup.Id))
            .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);

        var pendingStatusIds = pendingApprovalOnly
            ? lookupNames
                .Where(pair => QuizLookupNames.PendingQuestionStatusNames.Any(name =>
                    name.Equals(pair.Value, StringComparison.OrdinalIgnoreCase)))
                .Select(pair => pair.Key)
                .ToHashSet()
            : null;

        var approvedStatusIds = eligibleForQuizOnly
            ? lookupNames
                .Where(pair => QuizLookupNames.ApprovedQuestionStatusNames.Any(name =>
                    name.Equals(pair.Value, StringComparison.OrdinalIgnoreCase)))
                .Select(pair => pair.Key)
                .ToHashSet()
            : null;

        return rows
            .Where(row => pendingStatusIds is null || pendingStatusIds.Contains(row.StatusId))
            .Where(row => approvedStatusIds is null || approvedStatusIds.Contains(row.StatusId))
            .Select(row => new QuestionListItem(
                row.Id,
                row.QuestionText,
                lookupNames.GetValueOrDefault(row.QuestionTypeId, "Multiple Choice"),
                lookupNames.GetValueOrDefault(row.StatusId, "Pending"),
                row.Marks,
                row.IsActive,
                row.CreatedBy,
                row.ApprovedBy,
                row.IsAiApproved,
                row.CreatedDate,
                row.ModifiedDate))
            .ToArray();
    }

    public async Task<QuestionDetailItem?> GetQuestionDetailAsync(long questionId, CancellationToken cancellationToken)
    {
        var question = await _dbContext.Questions.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == questionId, cancellationToken);

        if (question is null)
        {
            return null;
        }

        var options = await _dbContext.QuestionOptions.AsNoTracking()
            .Where(option => option.QuestionId == questionId && option.IsActive)
            .Select(option => new QuizQuestionOptionItem(
                option.Id,
                option.OptionText,
                option.OptionImageUrl,
                option.IsCorrect))
            .ToListAsync(cancellationToken);

        var lookupIds = new[] { question.QuestionTypeId, question.StatusId };
        var lookupNames = await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => lookupIds.Contains(lookup.Id))
            .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);

        return new QuestionDetailItem(
            question.Id,
            question.QuestionText,
            question.QuestionTypeId,
            lookupNames.GetValueOrDefault(question.QuestionTypeId, "Multiple Choice"),
            question.ClassId,
            question.SubjectId,
            question.TopicId,
            question.DifficultyLevel,
            question.StatusId,
            lookupNames.GetValueOrDefault(question.StatusId, "Pending"),
            question.Marks,
            question.EstimatedTimeSeconds,
            question.Hint,
            question.Explanation,
            question.IsActive,
            question.CreatedBy,
            question.ApprovedBy,
            question.IsAiApproved,
            question.RejectionReason,
            question.CreatedDate,
            question.ModifiedDate,
            options);
    }

    public Task<int> CountQuizLinksAsync(long questionId, CancellationToken cancellationToken)
    {
        return _dbContext.QuizQuestions.AsNoTracking()
            .CountAsync(link => link.QuestionId == questionId, cancellationToken);
    }

    public async Task RemoveAllQuizLinksForQuestionAsync(long questionId, CancellationToken cancellationToken)
    {
        var links = await _dbContext.QuizQuestions
            .Where(link => link.QuestionId == questionId)
            .ToListAsync(cancellationToken);
        _dbContext.QuizQuestions.RemoveRange(links);
    }

    public Task DeleteQuestionAsync(Question question, CancellationToken cancellationToken)
    {
        _dbContext.Questions.Remove(question);
        return Task.CompletedTask;
    }

    public async Task RemoveQuestionOptionsAsync(long questionId, CancellationToken cancellationToken)
    {
        var options = await _dbContext.QuestionOptions
            .Where(option => option.QuestionId == questionId)
            .ToListAsync(cancellationToken);
        _dbContext.QuestionOptions.RemoveRange(options);
    }

    public async Task AddQuestionOptionsAsync(IReadOnlyList<QuestionOption> options, CancellationToken cancellationToken)
    {
        await _dbContext.QuestionOptions.AddRangeAsync(options, cancellationToken);
    }
}
