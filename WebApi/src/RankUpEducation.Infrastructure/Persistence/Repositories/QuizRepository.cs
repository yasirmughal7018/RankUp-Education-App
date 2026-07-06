using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Quizzes;
using RankUpEducation.Infrastructure.Persistence;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

public sealed class QuizRepository : IQuizRepository
{
    private readonly RankUpDbContext _dbContext;

    public QuizRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<IReadOnlyList<QuizListItem>> ListForStudentAsync(
        long studentId,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken)
    {
        return ListFromAssignmentsAsync(
            _dbContext.QuizAssignments.Where(assignment => assignment.StudentId == studentId),
            search,
            subject,
            grade,
            studentId,
            cancellationToken);
    }

    public Task<IReadOnlyList<QuizListItem>> ListForLinkedStudentsAsync(
        IReadOnlyList<long> studentIds,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken)
    {
        if (studentIds.Count == 0)
        {
            return Task.FromResult<IReadOnlyList<QuizListItem>>(Array.Empty<QuizListItem>());
        }

        return ListFromAssignmentsAsync(
            _dbContext.QuizAssignments.Where(assignment => studentIds.Contains(assignment.StudentId)),
            search,
            subject,
            grade,
            null,
            cancellationToken);
    }

    public async Task<IReadOnlyList<QuizListItem>> ListForTeacherAsync(
        long teacherUserId,
        int schoolId,
        int campusId,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Quizzes.AsNoTracking()
            .Where(quiz => quiz.SchoolId == schoolId
                && quiz.SchoolCampusId == campusId
                && quiz.IsActive
                && !quiz.IsDeleted);

        query = ApplyQuizFilters(query, search, subject, grade);
        var quizzes = await query.ToListAsync(cancellationToken);
        var lookupNames = await LoadLookupNamesAsync(quizzes, cancellationToken);
        var schools = await LoadSchoolNamesAsync(quizzes.Select(quiz => quiz.SchoolId).Distinct(), cancellationToken);

        var items = new List<QuizListItem>();
        foreach (var quiz in quizzes)
        {
            var item = MapQuizWithoutAssignment(quiz, lookupNames, schools, attemptCount: 0, bestPercentage: null, lastSubmittedAt: null);
            if (MatchesFilters(item, search, subject, grade))
            {
                items.Add(item);
            }
        }

        return items;
    }

    public async Task<IReadOnlyList<QuizListItem>> ListForSchoolAsync(
        int? schoolId,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Quizzes.AsNoTracking()
            .Where(quiz => quiz.IsActive && !quiz.IsDeleted);

        if (schoolId is not null)
        {
            query = query.Where(quiz => quiz.SchoolId == schoolId.Value);
        }

        query = ApplyQuizFilters(query, search, subject, grade);
        var quizzes = await query.ToListAsync(cancellationToken);
        var lookupNames = await LoadLookupNamesAsync(quizzes, cancellationToken);
        var schools = await LoadSchoolNamesAsync(quizzes.Select(quiz => quiz.SchoolId).Distinct(), cancellationToken);

        return quizzes
            .Select(quiz => MapQuizWithoutAssignment(quiz, lookupNames, schools, 0, null, null))
            .ToArray();
    }

    public async Task<QuizDetailItem?> GetDetailForStudentAsync(
        long quizId,
        long studentId,
        CancellationToken cancellationToken)
    {
        var assignment = await _dbContext.QuizAssignments.AsNoTracking()
            .FirstOrDefaultAsync(item => item.QuizId == quizId && item.StudentId == studentId, cancellationToken);

        if (assignment is null)
        {
            return null;
        }

        var quiz = await _dbContext.Quizzes.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == quizId && item.IsActive && !item.IsDeleted, cancellationToken);

        if (quiz is null)
        {
            return null;
        }

        var stats = await GetAttemptStatsAsync(quizId, studentId, cancellationToken);
        var lookupNames = await LoadLookupNamesAsync([quiz], cancellationToken);
        var schools = await LoadSchoolNamesAsync([quiz.SchoolId], cancellationToken);

        return MapQuizDetail(quiz, assignment, lookupNames, schools, stats.AttemptCount, stats.BestPercentage, stats.LastSubmittedAt);
    }

    public Task<QuizAssignmentAccess?> GetAssignmentAccessAsync(
        long quizId,
        long studentId,
        CancellationToken cancellationToken)
    {
        return _dbContext.QuizAssignments.AsNoTracking()
            .Where(assignment => assignment.QuizId == quizId && assignment.StudentId == studentId)
            .Select(assignment => new QuizAssignmentAccess(
                assignment.Id,
                assignment.QuizId,
                assignment.StudentId,
                assignment.StartDateTime,
                assignment.EndDateTime,
                assignment.AllowedAttempts,
                _dbContext.QuizAttempts.Count(attempt => attempt.QuizId == quizId && attempt.StudentId == studentId)))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<QuizQuestionItem>> GetQuizQuestionsAsync(
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

        var typeNames = await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => rows.Select(row => row.QuestionTypeId).Contains(lookup.Id))
            .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);

        return rows.Select(row => new QuizQuestionItem(
            row.QuestionId,
            row.QuestionText,
            row.QuestionTypeId,
            typeNames.GetValueOrDefault(row.QuestionTypeId, "Multiple Choice"),
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
                .ToArray())).ToArray();
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

        var statusName = await GetLookupNameAsync(attempt.StatusId, cancellationToken);
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

    public async Task<IReadOnlyList<long>> GetLinkedStudentIdsAsync(long parentId, CancellationToken cancellationToken)
    {
        return await _dbContext.ParentStudentRelations.AsNoTracking()
            .Where(relation => relation.ParentId == parentId && relation.IsActive)
            .Select(relation => relation.StudentId)
            .ToListAsync(cancellationToken);
    }

    public async Task<short> ResolveLookupIdAsync(
        string type,
        string name,
        short fallback,
        CancellationToken cancellationToken)
    {
        var id = await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => lookup.Type == type && lookup.Name == name)
            .Select(lookup => lookup.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return id == 0 ? fallback : id;
    }

    public async Task<string> GetLookupNameAsync(short id, CancellationToken cancellationToken)
    {
        var name = await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => lookup.Id == id)
            .Select(lookup => lookup.Name)
            .FirstOrDefaultAsync(cancellationToken);

        return name ?? "Unknown";
    }

    public Task<int> CountAttemptsAsync(long quizId, long studentId, CancellationToken cancellationToken)
    {
        return _dbContext.QuizAttempts.CountAsync(
            attempt => attempt.QuizId == quizId && attempt.StudentId == studentId,
            cancellationToken);
    }

    private async Task<IReadOnlyList<QuizListItem>> ListFromAssignmentsAsync(
        IQueryable<QuizAssignment> assignmentQuery,
        string? search,
        string? subject,
        string? grade,
        long? statsStudentId,
        CancellationToken cancellationToken)
    {
        var rows = await (
            from assignment in assignmentQuery.AsNoTracking()
            join quiz in _dbContext.Quizzes.AsNoTracking() on assignment.QuizId equals quiz.Id
            where quiz.IsActive && !quiz.IsDeleted
            select new { assignment, quiz }).ToListAsync(cancellationToken);

        if (rows.Count == 0)
        {
            return Array.Empty<QuizListItem>();
        }

        var lookupNames = await LoadLookupNamesAsync(rows.Select(row => row.quiz), cancellationToken);
        var schools = await LoadSchoolNamesAsync(rows.Select(row => row.quiz.SchoolId).Distinct(), cancellationToken);

        var items = new List<QuizListItem>();
        foreach (var row in rows)
        {
            var studentId = statsStudentId ?? row.assignment.StudentId;
            var stats = await GetAttemptStatsAsync(row.quiz.Id, studentId, cancellationToken);
            var item = MapQuizListItem(row.quiz, row.assignment, lookupNames, schools, stats);

            if (!MatchesFilters(item, search, subject, grade))
            {
                continue;
            }

            items.Add(item);
        }

        return items.OrderByDescending(item => item.StartDateTime).ToArray();
    }

    private static bool MatchesFilters(QuizListItem item, string? search, string? subject, string? grade)
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

    private async Task<(int AttemptCount, short? BestPercentage, DateTimeOffset? LastSubmittedAt)> GetAttemptStatsAsync(
        long quizId,
        long studentId,
        CancellationToken cancellationToken)
    {
        var attempts = await _dbContext.QuizAttempts.AsNoTracking()
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

    private static IQueryable<Quiz> ApplyQuizFilters(
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

    private static QuizListItem MapQuizListItem(
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

    private static QuizListItem MapQuizWithoutAssignment(
        Quiz quiz,
        IReadOnlyDictionary<short, string> lookupNames,
        IReadOnlyDictionary<int, string> schoolNames,
        int attemptCount,
        short? bestPercentage,
        DateTimeOffset? lastSubmittedAt)
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
            lastSubmittedAt);
    }

    private static QuizDetailItem MapQuizDetail(
        Quiz quiz,
        QuizAssignment assignment,
        IReadOnlyDictionary<short, string> lookupNames,
        IReadOnlyDictionary<int, string> schoolNames,
        int attemptCount,
        short? bestPercentage,
        DateTimeOffset? lastSubmittedAt)
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
            lastSubmittedAt);
    }

    private async Task<IReadOnlyDictionary<short, string>> LoadLookupNamesAsync(
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
                quiz.DifficultyLevelId
            })
            .Distinct()
            .ToArray();

        return await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => ids.Contains(lookup.Id))
            .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);
    }

    private async Task<IReadOnlyDictionary<int, string>> LoadSchoolNamesAsync(
        IEnumerable<int> schoolIds,
        CancellationToken cancellationToken)
    {
        var ids = schoolIds.Distinct().Select(id => (long)id).ToArray();
        return await _dbContext.Schools.AsNoTracking()
            .Where(school => ids.Contains(school.Id))
            .ToDictionaryAsync(school => (int)school.Id, school => school.Name, cancellationToken);
    }
}
