using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

internal static class QuizQueryHelper
{
    public static bool MatchesFilters(QuizListItem item, string? search, string? subject, string? grade)
    {
        if (!string.IsNullOrWhiteSpace(search)
            && !item.QuizTitle.Contains(search, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(subject)
            && !item.SubjectName.Equals(subject, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(grade)
            && !item.GradeName.Equals(grade, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    }

    public static IQueryable<Quiz> ApplyQuizFilters(
        IQueryable<Quiz> query,
        string? search,
        string? subject,
        string? grade)
    {
        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(quiz => quiz.QuizTitle.Contains(search));
        }

        return query;
    }

    public static QuizListItem MapQuizListItem(
        Quiz quiz,
        QuizAssignment assignment,
        IReadOnlyDictionary<short, string> lookupNames,
        IReadOnlyDictionary<int, string> schoolNames,
        (int AttemptCount, short? BestPercentage, DateTimeOffset? LastSubmittedAt) stats)
    {
        return new QuizListItem(
            quiz.Id,
            assignment.Id,
            quiz.QuizTitle,
            quiz.Description,
            quiz.TotalQuestions,
            quiz.TotalMarks,
            quiz.TimeLimitMinutes,
            assignment.AllowedAttempts,
            assignment.StartDateTime,
            assignment.EndDateTime,
            quiz.CreatedByName,
            schoolNames.GetValueOrDefault(quiz.SchoolId, "School"),
            lookupNames.GetValueOrDefault(quiz.SubjectId, "Subject"),
            lookupNames.GetValueOrDefault(quiz.ClassId, "Grade"),
            lookupNames.GetValueOrDefault(quiz.TopicId, "Topic"),
            lookupNames.GetValueOrDefault(quiz.QuizTypeId, "Quiz"),
            lookupNames.GetValueOrDefault(quiz.DifficultyLevelId, "Medium"),
            quiz.Instructions,
            quiz.IsReviewRequired,
            stats.AttemptCount,
            stats.BestPercentage,
            stats.LastSubmittedAt);
    }

    public static QuizListItem MapQuizWithoutAssignment(
        Quiz quiz,
        IReadOnlyDictionary<short, string> lookupNames,
        IReadOnlyDictionary<int, string> schoolNames,
        int attemptCount,
        short? bestPercentage,
        DateTimeOffset? lastSubmittedAt,
        short lifecycleStatusId,
        string lifecycleStatusName)
    {
        return new QuizListItem(
            quiz.Id,
            null,
            quiz.QuizTitle,
            quiz.Description,
            quiz.TotalQuestions,
            quiz.TotalMarks,
            quiz.TimeLimitMinutes,
            quiz.AllowedAttempts ?? 1,
            null,
            null,
            quiz.CreatedByName,
            schoolNames.GetValueOrDefault(quiz.SchoolId, "School"),
            lookupNames.GetValueOrDefault(quiz.SubjectId, "Subject"),
            lookupNames.GetValueOrDefault(quiz.ClassId, "Grade"),
            lookupNames.GetValueOrDefault(quiz.TopicId, "Topic"),
            lookupNames.GetValueOrDefault(quiz.QuizTypeId, "Quiz"),
            lookupNames.GetValueOrDefault(quiz.DifficultyLevelId, "Medium"),
            quiz.Instructions,
            quiz.IsReviewRequired,
            attemptCount,
            bestPercentage,
            lastSubmittedAt,
            lifecycleStatusName);
    }

    public static QuizDetailItem MapQuizDetail(
        Quiz quiz,
        QuizAssignment assignment,
        IReadOnlyDictionary<short, string> lookupNames,
        IReadOnlyDictionary<int, string> schoolNames,
        int attemptCount,
        short? bestPercentage,
        DateTimeOffset? lastSubmittedAt,
        short lifecycleStatusId,
        string lifecycleStatusName)
    {
        return new QuizDetailItem(
            quiz.Id,
            assignment.Id,
            quiz.QuizTitle,
            quiz.Description,
            quiz.TotalQuestions,
            quiz.TotalMarks,
            quiz.TimeLimitMinutes,
            assignment.AllowedAttempts,
            assignment.StartDateTime,
            assignment.EndDateTime,
            quiz.CreatedByName,
            schoolNames.GetValueOrDefault(quiz.SchoolId, "School"),
            lookupNames.GetValueOrDefault(quiz.SubjectId, "Subject"),
            lookupNames.GetValueOrDefault(quiz.ClassId, "Grade"),
            lookupNames.GetValueOrDefault(quiz.TopicId, "Topic"),
            lookupNames.GetValueOrDefault(quiz.QuizTypeId, "Quiz"),
            lookupNames.GetValueOrDefault(quiz.DifficultyLevelId, "Medium"),
            quiz.Instructions,
            quiz.ShuffleQuestions,
            quiz.ShuffleOptions,
            quiz.IsReviewRequired,
            attemptCount,
            bestPercentage,
            lastSubmittedAt,
            quiz.ClassId,
            quiz.SubjectId,
            quiz.TopicId,
            quiz.DifficultyLevelId,
            lifecycleStatusId,
            lifecycleStatusName);
    }

    public static async Task<IReadOnlyDictionary<short, string>> LoadLifecycleNamesAsync(
        RankUpDbContext dbContext,
        IEnumerable<short> lifecycleStatusIds,
        CancellationToken cancellationToken)
    {
        var ids = lifecycleStatusIds.Distinct().ToArray();
        return await dbContext.Lookups.AsNoTracking()
            .Where(lookup => ids.Contains(lookup.Id))
            .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);
    }

    public static async Task<IReadOnlyDictionary<short, string>> LoadLookupNamesAsync(
        RankUpDbContext dbContext,
        IEnumerable<Quiz> quizzes,
        CancellationToken cancellationToken)
    {
        var ids = quizzes
            .SelectMany(quiz => new short[]
            {
                quiz.SubjectId,
                quiz.ClassId,
                quiz.TopicId,
                quiz.QuizTypeId,
                quiz.DifficultyLevelId,
                quiz.LifecycleStatusId
            })
            .Distinct()
            .ToArray();

        return await dbContext.Lookups.AsNoTracking()
            .Where(lookup => ids.Contains(lookup.Id))
            .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);
    }

    public static async Task<IReadOnlyDictionary<int, string>> LoadSchoolNamesAsync(
        RankUpDbContext dbContext,
        IEnumerable<int> schoolIds,
        CancellationToken cancellationToken)
    {
        var ids = schoolIds.Distinct().Select(id => (long)id).ToArray();
        return await dbContext.Schools.AsNoTracking()
            .Where(school => ids.Contains(school.Id))
            .ToDictionaryAsync(school => (int)school.Id, school => school.Name, cancellationToken);
    }

    public static async Task<IReadOnlyDictionary<long, string>> LoadStudentNamesAsync(
        RankUpDbContext dbContext,
        IEnumerable<long> studentIds,
        CancellationToken cancellationToken)
    {
        var ids = studentIds.Distinct().ToArray();
        if (ids.Length == 0)
        {
            return new Dictionary<long, string>();
        }

        return await dbContext.Users.AsNoTracking()
            .Where(user => ids.Contains(user.Id))
            .ToDictionaryAsync(user => user.Id, user => user.FullName, cancellationToken);
    }

    public static async Task<(int AttemptCount, short? BestPercentage, DateTimeOffset? LastSubmittedAt)> GetAttemptStatsAsync(
        RankUpDbContext dbContext,
        long quizId,
        long studentId,
        CancellationToken cancellationToken)
    {
        var attempts = await dbContext.QuizAttempts.AsNoTracking()
            .Where(attempt => attempt.QuizId == quizId && attempt.StudentId == studentId)
            .Select(attempt => new { attempt.Percentage, attempt.SubmittedDate })
            .ToListAsync(cancellationToken);

        if (attempts.Count == 0)
        {
            return (0, null, null);
        }

        return (
            attempts.Count,
            attempts.Max(attempt => (short?)attempt.Percentage),
            attempts.Max(attempt => (DateTimeOffset?)attempt.SubmittedDate));
    }

    public static async Task<IReadOnlyList<short>> ResolveStatusIdsByNamesAsync(
        RankUpDbContext dbContext,
        string type,
        IReadOnlyList<string> names,
        CancellationToken cancellationToken)
    {
        return await dbContext.Lookups.AsNoTracking()
            .Where(lookup => lookup.Type == type && names.Contains(lookup.Name))
            .Select(lookup => lookup.Id)
            .ToListAsync(cancellationToken);
    }
}
