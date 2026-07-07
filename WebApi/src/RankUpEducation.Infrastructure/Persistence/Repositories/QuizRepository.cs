using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Questions;
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
            var item = MapQuizWithoutAssignment(
                quiz,
                lookupNames,
                schools,
                attemptCount: 0,
                bestPercentage: null,
                lastSubmittedAt: null,
                quiz.LifecycleStatusId,
                lookupNames.GetValueOrDefault(quiz.LifecycleStatusId, "Unknown"));
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
            .Select(quiz => MapQuizWithoutAssignment(
                quiz,
                lookupNames,
                schools,
                0,
                null,
                null,
                quiz.LifecycleStatusId,
                lookupNames.GetValueOrDefault(quiz.LifecycleStatusId, "Unknown")))
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

        return MapQuizDetail(
            quiz,
            assignment,
            lookupNames,
            schools,
            stats.AttemptCount,
            stats.BestPercentage,
            stats.LastSubmittedAt,
            quiz.LifecycleStatusId,
            lookupNames.GetValueOrDefault(quiz.LifecycleStatusId, "Unknown"));
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

    public async Task<short> ResolveLookupIdByNamesAsync(
        string type,
        IReadOnlyList<string> names,
        short fallback,
        CancellationToken cancellationToken)
    {
        foreach (var name in names)
        {
            var id = await ResolveLookupIdAsync(type, name, 0, cancellationToken);
            if (id != 0)
            {
                return id;
            }
        }

        return fallback;
    }

    public async Task AddQuizAsync(Quiz quiz, CancellationToken cancellationToken)
    {
        await _dbContext.Quizzes.AddAsync(quiz, cancellationToken);
    }

    public async Task AddQuestionAsync(Question question, CancellationToken cancellationToken)
    {
        await _dbContext.Questions.AddAsync(question, cancellationToken);
    }

    public async Task AddQuestionOptionsAsync(IReadOnlyList<QuestionOption> options, CancellationToken cancellationToken)
    {
        await _dbContext.QuestionOptions.AddRangeAsync(options, cancellationToken);
    }

    public async Task AddQuizQuestionAsync(QuizQuestion quizQuestion, CancellationToken cancellationToken)
    {
        await _dbContext.QuizQuestions.AddAsync(quizQuestion, cancellationToken);
    }

    public Task<Quiz?> GetQuizEntityAsync(long quizId, CancellationToken cancellationToken)
    {
        return _dbContext.Quizzes.FirstOrDefaultAsync(quiz => quiz.Id == quizId && !quiz.IsDeleted, cancellationToken);
    }

    public Task<Question?> GetQuestionEntityAsync(long questionId, CancellationToken cancellationToken)
    {
        return _dbContext.Questions.FirstOrDefaultAsync(question => question.Id == questionId && question.IsActive, cancellationToken);
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

    public async Task RemoveQuestionOptionsAsync(long questionId, CancellationToken cancellationToken)
    {
        var options = await _dbContext.QuestionOptions
            .Where(option => option.QuestionId == questionId)
            .ToListAsync(cancellationToken);
        _dbContext.QuestionOptions.RemoveRange(options);
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

    public async Task<bool> HasStartedAssignmentsAsync(long quizId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var hasStartedWindow = await _dbContext.QuizAssignments.AsNoTracking()
            .AnyAsync(assignment => assignment.QuizId == quizId && assignment.StartDateTime <= now, cancellationToken);

        if (hasStartedWindow)
        {
            return true;
        }

        return await _dbContext.QuizAttempts.AsNoTracking()
            .AnyAsync(attempt => attempt.QuizId == quizId, cancellationToken);
    }

    public Task<bool> HasAnyAssignmentsAsync(long quizId, CancellationToken cancellationToken)
    {
        return _dbContext.QuizAssignments.AsNoTracking()
            .AnyAsync(assignment => assignment.QuizId == quizId, cancellationToken);
    }

    public Task<bool> HasAnyAttemptsAsync(long quizId, CancellationToken cancellationToken)
    {
        return _dbContext.QuizAttempts.AsNoTracking()
            .AnyAsync(attempt => attempt.QuizId == quizId, cancellationToken);
    }

    public async Task<IReadOnlyList<QuizListItem>> ListForCreatorAsync(
        long creatorUserId,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken)
    {
        var creatorKey = creatorUserId.ToString();
        var query = _dbContext.Quizzes.AsNoTracking()
            .Where(quiz => quiz.CreatedByName == creatorKey && !quiz.IsDeleted);

        query = ApplyQuizFilters(query, search, subject, grade);
        var quizzes = await query.OrderByDescending(quiz => quiz.CreatedDate).ToListAsync(cancellationToken);
        if (quizzes.Count == 0)
        {
            return Array.Empty<QuizListItem>();
        }

        var lookupNames = await LoadLookupNamesAsync(quizzes, cancellationToken);
        var lifecycleNames = await LoadLifecycleNamesAsync(quizzes.Select(quiz => quiz.LifecycleStatusId), cancellationToken);
        var schools = await LoadSchoolNamesAsync(quizzes.Select(quiz => quiz.SchoolId).Distinct(), cancellationToken);

        return quizzes
            .Select(quiz => MapQuizWithoutAssignment(
                quiz,
                lookupNames,
                schools,
                0,
                null,
                null,
                quiz.LifecycleStatusId,
                lifecycleNames.GetValueOrDefault(quiz.LifecycleStatusId, "Unknown")))
            .Where(item => MatchesFilters(item, search, subject, grade))
            .ToArray();
    }

    public async Task<QuizDetailItem?> GetDetailForCreatorAsync(
        long quizId,
        long creatorUserId,
        CancellationToken cancellationToken)
    {
        var creatorKey = creatorUserId.ToString();
        var quiz = await _dbContext.Quizzes.AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.Id == quizId && item.CreatedByName == creatorKey && !item.IsDeleted,
                cancellationToken);

        if (quiz is null)
        {
            return null;
        }

        var lookupNames = await LoadLookupNamesAsync([quiz], cancellationToken);
        var lifecycleName = await GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        var schools = await LoadSchoolNamesAsync([quiz.SchoolId], cancellationToken);

        return new QuizDetailItem(
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
            schools.GetValueOrDefault(quiz.SchoolId, "School"),
            lookupNames.GetValueOrDefault(quiz.SubjectId, "Subject"),
            lookupNames.GetValueOrDefault(quiz.ClassId, "Grade"),
            lookupNames.GetValueOrDefault(quiz.TopicId, "Topic"),
            lookupNames.GetValueOrDefault(quiz.QuizTypeId, "Quiz"),
            lookupNames.GetValueOrDefault(quiz.DifficultyLevelId, "Medium"),
            quiz.Instructions,
            quiz.ShuffleQuestions,
            quiz.ShuffleOptions,
            quiz.IsReviewRequired,
            0,
            null,
            null,
            quiz.LifecycleStatusId,
            lifecycleName);
    }

    public async Task<StudentSchoolContext?> GetStudentSchoolContextAsync(long studentId, CancellationToken cancellationToken)
    {
        return await _dbContext.Students.AsNoTracking()
            .Where(student => student.Id == studentId && !student.IsDeleted)
            .Select(student => new StudentSchoolContext(student.SchoolId, student.CampusId, student.Grade))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<bool> IsLinkedStudentAsync(long parentId, long studentId, CancellationToken cancellationToken)
    {
        return _dbContext.ParentStudentRelations.AsNoTracking()
            .AnyAsync(
                relation => relation.ParentId == parentId
                    && relation.StudentId == studentId
                    && relation.IsActive,
                cancellationToken);
    }

    public Task<bool> IsStudentInSchoolAsync(
        long studentId,
        int schoolId,
        int campusId,
        CancellationToken cancellationToken)
    {
        return _dbContext.Students.AsNoTracking()
            .AnyAsync(
                student => student.Id == studentId
                    && student.SchoolId == schoolId
                    && student.CampusId == campusId
                    && !student.IsDeleted,
                cancellationToken);
    }

    public async Task<IReadOnlyList<long>> GetStudentIdsInSchoolByGradeAsync(
        int schoolId,
        int campusId,
        short gradeId,
        CancellationToken cancellationToken)
    {
        return await _dbContext.Students.AsNoTracking()
            .Where(student => student.SchoolId == schoolId
                && student.CampusId == campusId
                && student.Grade == gradeId
                && !student.IsDeleted)
            .Select(student => student.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> IsParentPrivateQuizTypeAsync(short quizTypeId, CancellationToken cancellationToken)
    {
        var typeName = await GetLookupNameAsync(quizTypeId, cancellationToken);
        return QuizLookupNames.ParentPrivateQuizTypeNames
            .Any(name => name.Equals(typeName, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<IReadOnlyList<long>> GetGroupMemberStudentIdsAsync(
        long groupId,
        long ownerUserId,
        string creatorRole,
        CancellationToken cancellationToken)
    {
        var groupExists = await _dbContext.StudentGroups.AsNoTracking()
            .AnyAsync(
                group => group.Id == groupId
                    && group.ReferralId == ownerUserId
                    && group.CreatorRole == creatorRole
                    && group.IsActive,
                cancellationToken);

        if (!groupExists)
        {
            return Array.Empty<long>();
        }

        return await _dbContext.StudentGroupMembers.AsNoTracking()
            .Where(member => member.StudentGroupId == groupId)
            .Select(member => member.StudentId)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAssignmentsAsync(IReadOnlyList<QuizAssignment> assignments, CancellationToken cancellationToken)
    {
        await _dbContext.QuizAssignments.AddRangeAsync(assignments, cancellationToken);
    }

    public async Task<IReadOnlyList<QuizAssignmentListItem>> ListAssignmentsForQuizAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        var assignments = await _dbContext.QuizAssignments.AsNoTracking()
            .Where(assignment => assignment.QuizId == quizId)
            .OrderBy(assignment => assignment.StartDateTime)
            .ToListAsync(cancellationToken);

        if (assignments.Count == 0)
        {
            return Array.Empty<QuizAssignmentListItem>();
        }

        var resultStatusNames = await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => assignments.Select(item => item.QuizResultStatus).Contains(lookup.Id))
            .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);

        var items = new List<QuizAssignmentListItem>();
        foreach (var assignment in assignments)
        {
            var attemptCount = await _dbContext.QuizAttempts.AsNoTracking()
                .CountAsync(
                    attempt => attempt.QuizId == quizId && attempt.StudentId == assignment.StudentId,
                    cancellationToken);

            items.Add(new QuizAssignmentListItem(
                assignment.Id,
                assignment.StudentId,
                assignment.StudentGroupId,
                assignment.StartDateTime,
                assignment.EndDateTime,
                assignment.AllowedAttempts,
                assignment.QuizResultStatus,
                resultStatusNames.GetValueOrDefault(assignment.QuizResultStatus, "Unknown"),
                assignment.IsReviewDone,
                attemptCount));
        }

        return items;
    }

    public async Task<int> RemoveFutureAssignmentsAsync(long quizId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var assignments = await _dbContext.QuizAssignments
            .Where(assignment => assignment.QuizId == quizId && assignment.StartDateTime > now)
            .ToListAsync(cancellationToken);

        if (assignments.Count == 0)
        {
            return 0;
        }

        _dbContext.QuizAssignments.RemoveRange(assignments);
        return assignments.Count;
    }

    public Task<bool> AssignmentExistsAsync(long quizId, long studentId, CancellationToken cancellationToken)
    {
        return _dbContext.QuizAssignments.AsNoTracking()
            .AnyAsync(assignment => assignment.QuizId == quizId && assignment.StudentId == studentId, cancellationToken);
    }

    public Task DeleteQuizAsync(Quiz quiz, CancellationToken cancellationToken)
    {
        _dbContext.Quizzes.Remove(quiz);
        return Task.CompletedTask;
    }

    public async Task<IReadOnlyList<QuizAssignmentBoardItem>> ListAssignmentBoardForCreatorAsync(
        long creatorUserId,
        long? studentId,
        CancellationToken cancellationToken)
    {
        var creatorKey = creatorUserId.ToString();
        var query =
            from assignment in _dbContext.QuizAssignments.AsNoTracking()
            join quiz in _dbContext.Quizzes.AsNoTracking() on assignment.QuizId equals quiz.Id
            where quiz.CreatedByName == creatorKey && quiz.IsActive && !quiz.IsDeleted
            select new { assignment, quiz };

        if (studentId is not null)
        {
            query = query.Where(row => row.assignment.StudentId == studentId.Value);
        }

        var rows = await query.OrderByDescending(row => row.assignment.StartDateTime).ToListAsync(cancellationToken);
        if (rows.Count == 0)
        {
            return Array.Empty<QuizAssignmentBoardItem>();
        }

        var resultStatusNames = await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => rows.Select(row => row.assignment.QuizResultStatus).Contains(lookup.Id))
            .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);

        var items = new List<QuizAssignmentBoardItem>();
        foreach (var row in rows)
        {
            var stats = await GetAttemptStatsAsync(row.quiz.Id, row.assignment.StudentId, cancellationToken);
            items.Add(new QuizAssignmentBoardItem(
                row.assignment.Id,
                row.quiz.Id,
                row.quiz.QuizTitle,
                row.assignment.StudentId,
                row.assignment.StartDateTime,
                row.assignment.EndDateTime,
                row.assignment.AllowedAttempts,
                stats.AttemptCount,
                row.assignment.IsReviewDone,
                resultStatusNames.GetValueOrDefault(row.assignment.QuizResultStatus, "Unknown"),
                stats.LastSubmittedAt));
        }

        return items;
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

        var items = new List<QuizMonitoringStudentItem>();
        foreach (var assignment in assignments)
        {
            var stats = await GetAttemptStatsAsync(quizId, assignment.StudentId, cancellationToken);
            items.Add(new QuizMonitoringStudentItem(
                assignment.StudentId,
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
        var submittedStatusIds = await ResolveStatusIdsByNamesAsync(
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

        return new AttemptReviewDetailItem(
            attempt.Id,
            attempt.QuizId,
            quiz.QuizTitle,
            attempt.StudentId,
            attempt.NumberOfQuestionAttempt,
            (short)totalMarks,
            attempt.ObtainedMarks,
            attempt.Percentage,
            statusName,
            assignment?.IsReviewDone ?? false,
            attempt.SubmittedDate,
            attemptQuestions.Select(item =>
            {
                var answer = answers.FirstOrDefault(row => row.QuizAttemptQuestionId == item.Id);
                var typeName = typeNames.GetValueOrDefault(item.QuestionTypeId, "Multiple Choice");
                var requiresReview = QuizQuestionHelper.IsDescriptiveType(typeName)
                    || (answer?.QuestionOptionId is null && !string.IsNullOrWhiteSpace(answer?.SubmittedText));

                string? feedback = null;
                if (item.QuizReviewId is not null)
                {
                    reviews.TryGetValue(item.QuizReviewId.Value, out feedback);
                }

                return new AttemptReviewQuestionItem(
                    item.Id,
                    item.QuestionId,
                    item.QuestionText,
                    typeName,
                    quizQuestions.GetValueOrDefault(item.QuestionId, (short)0),
                    answer?.AwardedMarks ?? 0,
                    answer?.IsCorrect ?? false,
                    answer?.QuestionOptionId,
                    answer?.SubmittedText,
                    string.IsNullOrWhiteSpace(feedback) ? null : feedback,
                    requiresReview,
                    item.QuizReviewId);
            }).ToArray());
    }

    public Task<QuizAttempt?> GetAttemptEntityByIdAsync(long attemptId, long quizId, CancellationToken cancellationToken)
    {
        return _dbContext.QuizAttempts
            .FirstOrDefaultAsync(item => item.Id == attemptId && item.QuizId == quizId, cancellationToken);
    }

    public Task<QuizAssignment?> GetAssignmentEntityAsync(long quizId, long studentId, CancellationToken cancellationToken)
    {
        return _dbContext.QuizAssignments
            .FirstOrDefaultAsync(item => item.QuizId == quizId && item.StudentId == studentId, cancellationToken);
    }

    public async Task<QuizAssignmentReviewState?> GetAssignmentReviewStateAsync(
        long quizId,
        long studentId,
        CancellationToken cancellationToken)
    {
        return await (
            from assignment in _dbContext.QuizAssignments.AsNoTracking()
            join quiz in _dbContext.Quizzes.AsNoTracking() on assignment.QuizId equals quiz.Id
            where assignment.QuizId == quizId && assignment.StudentId == studentId
            select new QuizAssignmentReviewState(
                assignment.Id,
                assignment.IsReviewDone,
                quiz.IsReviewRequired))
            .FirstOrDefaultAsync(cancellationToken);
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

    public Task<QuizReview?> GetQuestionReviewEntityAsync(long reviewId, CancellationToken cancellationToken)
    {
        return _dbContext.QuizReviews.FirstOrDefaultAsync(review => review.Id == reviewId, cancellationToken);
    }

    public async Task AddReviewAsync(QuizReview review, CancellationToken cancellationToken)
    {
        await _dbContext.QuizReviews.AddAsync(review, cancellationToken);
    }

    public async Task<bool> IsSubmittedAttemptAsync(long attemptId, CancellationToken cancellationToken)
    {
        var submittedStatusIds = await ResolveStatusIdsByNamesAsync(
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
                .ToArray())).ToArray();
    }

    public Task<QuizAssignment?> GetAssignmentEntityByIdAsync(
        long assignmentId,
        long quizId,
        CancellationToken cancellationToken)
    {
        return _dbContext.QuizAssignments
            .FirstOrDefaultAsync(
                assignment => assignment.Id == assignmentId && assignment.QuizId == quizId,
                cancellationToken);
    }

    private async Task<IReadOnlyList<short>> ResolveStatusIdsByNamesAsync(
        string type,
        IReadOnlyList<string> names,
        CancellationToken cancellationToken)
    {
        return await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => lookup.Type == type && names.Contains(lookup.Name))
            .Select(lookup => lookup.Id)
            .ToListAsync(cancellationToken);
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

    private static QuizDetailItem MapQuizDetail(
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
            lifecycleStatusId,
            lifecycleStatusName);
    }

    private async Task<IReadOnlyDictionary<short, string>> LoadLifecycleNamesAsync(
        IEnumerable<short> lifecycleStatusIds,
        CancellationToken cancellationToken)
    {
        var ids = lifecycleStatusIds.Distinct().ToArray();
        return await _dbContext.Lookups.AsNoTracking()
            .Where(lookup => ids.Contains(lookup.Id))
            .ToDictionaryAsync(lookup => lookup.Id, lookup => lookup.Name, cancellationToken);
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
                quiz.DifficultyLevelId,
                quiz.LifecycleStatusId
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
