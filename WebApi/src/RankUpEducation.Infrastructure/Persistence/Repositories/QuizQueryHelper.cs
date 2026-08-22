using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Approvals;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

internal static class QuizQueryHelper
{
    internal static string ResolveLookupName(
        IReadOnlyDictionary<short, string> lookupNames,
        short? id,
        string whenMissing,
        string whenUnset = "—")
        => id is short value
            ? lookupNames.GetValueOrDefault(value, whenMissing)
            : whenUnset;

    internal static string ResolveSchoolName(
        IReadOnlyDictionary<int, string> schoolNames,
        int? schoolId)
        => schoolId is int id
            ? schoolNames.GetValueOrDefault(id, "School")
            : "—";

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
        (int AttemptCount, short? BestPercentage, DateTimeOffset? LastSubmittedAt) stats,
        string? quizResultStatusName = null)
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
            ResolveSchoolName(schoolNames, quiz.SchoolId),
            lookupNames.GetValueOrDefault(quiz.SubjectId, "Subject"),
            lookupNames.GetValueOrDefault(quiz.ClassId, "Grade"),
            ResolveLookupName(lookupNames, quiz.TopicId, "Topic"),
            lookupNames.GetValueOrDefault(quiz.QuizTypeId, "Quiz"),
            ResolveLookupName(lookupNames, quiz.DifficultyLevelId, "Medium"),
            quiz.Instructions,
            quiz.IsReviewRequired,
            stats.AttemptCount,
            stats.BestPercentage,
            stats.LastSubmittedAt,
            QuizResultStatusName: quizResultStatusName
                ?? lookupNames.GetValueOrDefault(assignment.QuizResultStatus));
    }

    public static QuizListItem MapQuizWithoutAssignment(
        Quiz quiz,
        IReadOnlyDictionary<short, string> lookupNames,
        IReadOnlyDictionary<int, string> schoolNames,
        int attemptCount,
        short? bestPercentage,
        DateTimeOffset? lastSubmittedAt,
        short lifecycleStatusId,
        string lifecycleStatusName,
        string? approvalStatusName = null,
        bool hasSubmittedForReview = false)
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
            ResolveSchoolName(schoolNames, quiz.SchoolId),
            lookupNames.GetValueOrDefault(quiz.SubjectId, "Subject"),
            lookupNames.GetValueOrDefault(quiz.ClassId, "Grade"),
            ResolveLookupName(lookupNames, quiz.TopicId, "Topic"),
            lookupNames.GetValueOrDefault(quiz.QuizTypeId, "Quiz"),
            ResolveLookupName(lookupNames, quiz.DifficultyLevelId, "Medium"),
            quiz.Instructions,
            quiz.IsReviewRequired,
            attemptCount,
            bestPercentage,
            lastSubmittedAt,
            lifecycleStatusName,
            ApprovalStatusName: approvalStatusName
                ?? lookupNames.GetValueOrDefault(quiz.ApprovalStatusId, "Pending"),
            HasSubmittedForReview: hasSubmittedForReview);
    }

    public static IQueryable<long> SubmittedForReviewQuizIds(RankUpDbContext dbContext)
        => dbContext.Approvals.AsNoTracking()
            .Where(approval =>
                approval.EntityType == ApprovalEntityType.Quiz
                && approval.RequestId != null
                && approval.Action == ApprovalAction.SubmittedForReview)
            .Select(approval => approval.RequestId!.Value);

    public static async Task<IReadOnlySet<long>> LoadQuizIdsSubmittedForReviewAsync(
        RankUpDbContext dbContext,
        IEnumerable<long> quizIds,
        CancellationToken cancellationToken)
    {
        var ids = quizIds.Distinct().ToArray();
        if (ids.Length == 0)
        {
            return new HashSet<long>();
        }

        var submittedIds = await dbContext.Approvals.AsNoTracking()
            .Where(approval =>
                approval.EntityType == ApprovalEntityType.Quiz
                && approval.RequestId != null
                && ids.Contains(approval.RequestId.Value)
                && approval.Action == ApprovalAction.SubmittedForReview)
            .Select(approval => approval.RequestId!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        return submittedIds.ToHashSet();
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
        string lifecycleStatusName,
        string? quizResultStatusName = null)
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
            ResolveSchoolName(schoolNames, quiz.SchoolId),
            lookupNames.GetValueOrDefault(quiz.SubjectId, "Subject"),
            lookupNames.GetValueOrDefault(quiz.ClassId, "Grade"),
            ResolveLookupName(lookupNames, quiz.TopicId, "Topic"),
            lookupNames.GetValueOrDefault(quiz.QuizTypeId, "Quiz"),
            ResolveLookupName(lookupNames, quiz.DifficultyLevelId, "Medium"),
            quiz.Instructions,
            quiz.ShuffleQuestions,
            quiz.ShuffleOptions,
            quiz.IsReviewRequired,
            quiz.NavigationMode,
            attemptCount,
            bestPercentage,
            lastSubmittedAt,
            quiz.ClassId,
            quiz.SubjectId,
            quiz.TopicId ?? 0,
            quiz.DifficultyLevelId ?? 0,
            lifecycleStatusId,
            lifecycleStatusName,
            quizResultStatusName ?? lookupNames.GetValueOrDefault(assignment.QuizResultStatus),
            string.IsNullOrWhiteSpace(quiz.ReviewDisplayMode) ? "ScoreOnly" : quiz.ReviewDisplayMode,
            lookupNames.GetValueOrDefault(quiz.ApprovalStatusId, "Pending"),
            quiz.RejectionReason,
            RandomQuestionCount: quiz.RandomQuestionCount);
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
            .SelectMany(quiz => new short?[]
            {
                quiz.SubjectId,
                quiz.ClassId,
                quiz.TopicId,
                quiz.QuizTypeId,
                quiz.DifficultyLevelId,
                quiz.LifecycleStatusId,
                quiz.ApprovalStatusId
            })
            .Where(id => id is > 0)
            .Select(id => id!.Value)
            .Distinct()
            .ToArray();

        return await dbContext.Lookups.AsNoTracking()
            .Where(lookup => ids.Contains(lookup.Id))
            .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);
    }

    public static async Task<IReadOnlyDictionary<int, string>> LoadSchoolNamesAsync(
        RankUpDbContext dbContext,
        IEnumerable<int?> schoolIds,
        CancellationToken cancellationToken)
        => await LoadSchoolNamesAsync(
            dbContext,
            schoolIds.Where(id => id is > 0).Select(id => id!.Value),
            cancellationToken);

    public static async Task<IReadOnlyDictionary<int, string>> LoadSchoolNamesAsync(
        RankUpDbContext dbContext,
        IEnumerable<int> schoolIds,
        CancellationToken cancellationToken)
    {
        var ids = schoolIds.Distinct().Select(id => (long)id).ToArray();
        if (ids.Length == 0)
        {
            return new Dictionary<int, string>();
        }

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
