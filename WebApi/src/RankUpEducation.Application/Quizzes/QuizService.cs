using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Contracts.Quizzes;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

public interface IQuizService
{
    Task<QuizListResponse> ListAsync(
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken);

    Task<QuizDetailResponse> GetDetailAsync(long quizId, CancellationToken cancellationToken);

    Task<StartQuizAttemptResponse> StartAttemptAsync(
        long quizId,
        StartQuizAttemptRequest request,
        CancellationToken cancellationToken);

    Task<QuizAttemptResultResponse> SubmitAttemptAsync(
        long quizId,
        long attemptId,
        SubmitQuizAttemptRequest request,
        CancellationToken cancellationToken);

    Task<QuizAttemptResultResponse> GetAttemptResultAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken);
}

public sealed class QuizService : IQuizService
{
    private const string AttemptStatusType = "QuizAttemptStatus";
    private const string InProgressStatusName = "InProgress";
    private const string SubmittedStatusName = "Submitted";

    private readonly IQuizRepository _quizzes;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IUnitOfWork _unitOfWork;

    public QuizService(
        IQuizRepository quizzes,
        ICurrentUserService currentUser,
        IDateTimeProvider dateTimeProvider,
        IUnitOfWork unitOfWork)
    {
        _quizzes = quizzes;
        _currentUser = currentUser;
        _dateTimeProvider = dateTimeProvider;
        _unitOfWork = unitOfWork;
    }

    public async Task<QuizListResponse> ListAsync(
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken)
    {
        var role = ParseRole(_currentUser.Role);
        var now = _dateTimeProvider.UtcNow;

        IReadOnlyList<QuizListItem> items = role switch
        {
            UserRole.Student => await ListForStudentAsync(search, subject, grade, cancellationToken),
            UserRole.Parent => await ListForParentAsync(search, subject, grade, cancellationToken),
            UserRole.Teacher => await ListForTeacherAsync(search, subject, grade, cancellationToken),
            UserRole.SchoolAdmin => await _quizzes.ListForSchoolAsync(
                _currentUser.SchoolId,
                search,
                subject,
                grade,
                cancellationToken),
            UserRole.SuperAdmin => await _quizzes.ListForSchoolAsync(
                null,
                search,
                subject,
                grade,
                cancellationToken),
            _ => throw new ForbiddenAppException("Your role cannot access quizzes.")
        };

        return new QuizListResponse(items.Select(item => QuizMapping.ToSummaryResponse(item, now)).ToArray());
    }

    public async Task<QuizDetailResponse> GetDetailAsync(long quizId, CancellationToken cancellationToken)
    {
        var role = ParseRole(_currentUser.Role);
        var now = _dateTimeProvider.UtcNow;

        if (role == UserRole.Student)
        {
            var studentId = RequireStudentId();
            var detail = await _quizzes.GetDetailForStudentAsync(quizId, studentId, cancellationToken)
                ?? throw new NotFoundAppException("Quiz was not found for this student.");

            return QuizMapping.ToDetailResponse(detail, now);
        }

        if (role == UserRole.Parent)
        {
            var parentId = _currentUser.ProfileId ?? _currentUser.UserId
                ?? throw new ForbiddenAppException("Parent profile was not found.");

            var ownedDetail = await _quizzes.GetDetailForCreatorAsync(quizId, parentId, cancellationToken);
            if (ownedDetail is not null)
            {
                return QuizMapping.ToDetailResponse(ownedDetail, now);
            }
        }

        if (role == UserRole.Teacher)
        {
            var teacherUserId = _currentUser.UserId ?? throw new ForbiddenAppException("Teacher account was not found.");
            var ownedDetail = await _quizzes.GetDetailForCreatorAsync(quizId, teacherUserId, cancellationToken);
            if (ownedDetail is not null)
            {
                return QuizMapping.ToDetailResponse(ownedDetail, now);
            }
        }

        if (role is UserRole.Teacher or UserRole.SchoolAdmin or UserRole.SuperAdmin or UserRole.Parent)
        {
            var list = await ListAsync(null, null, null, cancellationToken);
            var summary = list.Items.FirstOrDefault(item => item.Id == quizId)
                ?? throw new NotFoundAppException("Quiz was not found.");

            var detail = new QuizDetailItem(
                summary.Id,
                null,
                summary.Title,
                summary.Description,
                summary.QuestionCount,
                summary.TotalMarks,
                summary.TimeLimitMinutes,
                summary.AttemptLimit,
                summary.StartAt,
                summary.DueAt,
                summary.CreatedBy,
                summary.SchoolName,
                summary.Subject,
                summary.Grade,
                summary.Topic,
                summary.QuizType,
                summary.Difficulty,
                string.Join('\n', summary.Instructions),
                true,
                true,
                summary.ReviewAvailable,
                0,
                summary.ResultPercent,
                summary.CompletedAt,
                0,
                summary.Status);

            return QuizMapping.ToDetailResponse(detail, now);
        }

        throw new ForbiddenAppException("Your role cannot access quiz details.");
    }

    public async Task<StartQuizAttemptResponse> StartAttemptAsync(
        long quizId,
        StartQuizAttemptRequest request,
        CancellationToken cancellationToken)
    {
        EnsureStudentRole();
        var studentId = RequireStudentId();
        ValidateDeviceId(request.DeviceId);

        var access = await _quizzes.GetAssignmentAccessAsync(quizId, studentId, cancellationToken)
            ?? throw new NotFoundAppException("This quiz is not assigned to you.");

        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("This quiz is not assigned to you.");

        if (!quiz.IsActive)
        {
            throw new BusinessRuleException("This quiz is no longer available.");
        }

        var now = _dateTimeProvider.UtcNow;
        EnsureAttemptWindow(access, now);

        if (access.ExistingAttemptCount >= access.AllowedAttempts)
        {
            throw new BusinessRuleException("You have used all allowed attempts for this quiz.");
        }

        var inProgressStatusId = await _quizzes.ResolveLookupIdAsync(
            AttemptStatusType,
            InProgressStatusName,
            fallback: 1,
            cancellationToken);

        var attemptNumber = (short)(access.ExistingAttemptCount + 1);
        var attempt = new QuizAttempt(
            quizId,
            studentId,
            attemptNumber,
            inProgressStatusId,
            request.DeviceId.Trim());
        attempt.Begin(inProgressStatusId);

        var quizQuestions = await _quizzes.GetQuizQuestionsAsync(quizId, cancellationToken);
        if (quizQuestions.Count == 0)
        {
            throw new BusinessRuleException("This quiz has no active questions.");
        }

        var orderedQuestions = quizQuestions.OrderBy(question => question.DisplayOrder).ToList();
        await _quizzes.AddAttemptAsync(attempt, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var attemptQuestions = orderedQuestions
            .Select((question, index) => new QuizAttemptQuestion(attempt.Id, question.QuestionId, (short)(index + 1)))
            .ToArray();

        await _quizzes.AddAttemptQuestionsAsync(attemptQuestions, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var quizDetail = await _quizzes.GetDetailForStudentAsync(quizId, studentId, cancellationToken);

        return new StartQuizAttemptResponse(
            attempt.Id,
            quizId,
            attemptNumber,
            quizDetail?.TimeLimitMinutes,
            attempt.StartedDate,
            orderedQuestions.Select(question => QuizMapping.ToAttemptQuestion(question, revealCorrectAnswers: false)).ToArray());
    }

    public async Task<QuizAttemptResultResponse> SubmitAttemptAsync(
        long quizId,
        long attemptId,
        SubmitQuizAttemptRequest request,
        CancellationToken cancellationToken)
    {
        EnsureStudentRole();
        var studentId = RequireStudentId();

        var attempt = await _quizzes.GetAttemptEntityAsync(attemptId, studentId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        if (attempt.QuizId != quizId)
        {
            throw new NotFoundAppException("Quiz attempt was not found.");
        }

        var submittedStatusId = await _quizzes.ResolveLookupIdAsync(
            AttemptStatusType,
            SubmittedStatusName,
            fallback: 2,
            cancellationToken);

        if (attempt.StatusId == submittedStatusId)
        {
            throw new BusinessRuleException("This quiz attempt has already been submitted.");
        }

        var quizQuestions = await _quizzes.GetQuizQuestionsAsync(quizId, cancellationToken);
        var questionMap = quizQuestions.ToDictionary(question => question.QuestionId);
        var totalMarks = (short)quizQuestions.Sum(question => question.Marks);
        short obtainedMarks = 0;

        var attemptDetail = await _quizzes.GetAttemptDetailAsync(attemptId, studentId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        var answersByQuestionId = request.Answers
            .GroupBy(answer => answer.QuestionId)
            .ToDictionary(group => group.Key, group => group.Last());

        var answerEntities = new List<QuizAttemptAnswer>();
        var hasSubjectiveAnswers = false;

        foreach (var attemptQuestion in attemptDetail.Questions)
        {
            if (!answersByQuestionId.TryGetValue(attemptQuestion.QuestionId, out var submitted))
            {
                continue;
            }

            if (!questionMap.TryGetValue(attemptQuestion.QuestionId, out var question))
            {
                continue;
            }

            long? selectedOptionId = submitted.SelectedOptionId;

            var isCorrect = false;
            short awardedMarks = 0;
            var isDescriptive = QuizQuestionHelper.IsDescriptiveType(question.QuestionTypeName)
                || (selectedOptionId is null && !string.IsNullOrWhiteSpace(submitted.SubmittedText));

            if (selectedOptionId is not null)
            {
                var selectedOption = question.Options.FirstOrDefault(option => option.OptionId == selectedOptionId);
                isCorrect = selectedOption?.IsCorrect ?? false;
                awardedMarks = isCorrect ? question.Marks : (short)0;
                obtainedMarks += awardedMarks;
            }
            else if (isDescriptive)
            {
                hasSubjectiveAnswers = true;
            }

            var answer = new QuizAttemptAnswer(
                attemptQuestion.AttemptQuestionId,
                selectedOptionId,
                submitted.SubmittedText);
            answer.Mark(awardedMarks, isCorrect);
            answerEntities.Add(answer);
        }

        await _quizzes.AddAttemptAnswersAsync(answerEntities, cancellationToken);

        attempt.MarkSubmitted(
            submittedStatusId,
            obtainedMarks,
            totalMarks,
            (short)Math.Clamp((int)request.TimeSpentSeconds, 0, short.MaxValue));

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var quizTitle = (await _quizzes.GetDetailForStudentAsync(quizId, studentId, cancellationToken))?.QuizTitle
            ?? "Quiz";

        var result = await _quizzes.GetAttemptDetailAsync(attemptId, studentId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        var reviewState = await _quizzes.GetAssignmentReviewStateAsync(quizId, studentId, cancellationToken);
        var maskPendingReview = reviewState is { IsReviewRequired: true, IsReviewDone: false } && hasSubjectiveAnswers;

        return QuizMapping.ToAttemptResult(
            result,
            quizTitle,
            reviewAvailable: !maskPendingReview,
            maskPendingReview: maskPendingReview,
            resultStatusOverride: maskPendingReview ? "Pending Review" : null);
    }

    public async Task<QuizAttemptResultResponse> GetAttemptResultAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken)
    {
        EnsureStudentRole();
        var studentId = RequireStudentId();

        var result = await _quizzes.GetAttemptDetailAsync(attemptId, studentId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        if (result.QuizId != quizId)
        {
            throw new NotFoundAppException("Quiz attempt was not found.");
        }

        var quizTitle = (await _quizzes.GetDetailForStudentAsync(quizId, studentId, cancellationToken))?.QuizTitle
            ?? "Quiz";

        var reviewState = await _quizzes.GetAssignmentReviewStateAsync(quizId, studentId, cancellationToken);
        var maskPendingReview = reviewState is { IsReviewRequired: true, IsReviewDone: false };

        return QuizMapping.ToAttemptResult(
            result,
            quizTitle,
            reviewAvailable: reviewState?.IsReviewDone ?? true,
            maskPendingReview: maskPendingReview,
            resultStatusOverride: maskPendingReview ? "Pending Review" : null);
    }

    private async Task<IReadOnlyList<QuizListItem>> ListForStudentAsync(
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken)
    {
        var studentId = RequireStudentId();
        return await _quizzes.ListForStudentAsync(studentId, search, subject, grade, cancellationToken);
    }

    private async Task<IReadOnlyList<QuizListItem>> ListForParentAsync(
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken)
    {
        var parentId = _currentUser.ProfileId ?? _currentUser.UserId
            ?? throw new ForbiddenAppException("Parent profile was not found.");

        var studentIds = await _quizzes.GetLinkedStudentIdsAsync(parentId, cancellationToken);
        var assignedItems = await _quizzes.ListForLinkedStudentsAsync(studentIds, search, subject, grade, cancellationToken);
        var createdItems = await _quizzes.ListForCreatorAsync(parentId, search, subject, grade, cancellationToken);

        return assignedItems
            .Concat(createdItems.Where(created => assignedItems.All(assigned => assigned.QuizId != created.QuizId)))
            .OrderByDescending(item => item.StartDateTime ?? DateTimeOffset.MinValue)
            .ThenByDescending(item => item.QuizId)
            .ToArray();
    }

    private async Task<IReadOnlyList<QuizListItem>> ListForTeacherAsync(
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken)
    {
        var teacherUserId = _currentUser.UserId ?? throw new ForbiddenAppException("Teacher account was not found.");
        var schoolId = _currentUser.SchoolId ?? throw new ForbiddenAppException("Teacher school context was not found.");
        var campusId = _currentUser.CampusId ?? throw new ForbiddenAppException("Teacher campus context was not found.");

        var schoolItems = await _quizzes.ListForTeacherAsync(
            teacherUserId,
            schoolId,
            campusId,
            search,
            subject,
            grade,
            cancellationToken);
        var createdItems = await _quizzes.ListForCreatorAsync(teacherUserId, search, subject, grade, cancellationToken);

        return schoolItems
            .Concat(createdItems.Where(created => schoolItems.All(item => item.QuizId != created.QuizId)))
            .OrderByDescending(item => item.StartDateTime ?? DateTimeOffset.MinValue)
            .ThenByDescending(item => item.QuizId)
            .ToArray();
    }

    private static void EnsureAttemptWindow(QuizAssignmentAccess access, DateTimeOffset now)
    {
        if (now < access.StartDateTime)
        {
            throw new BusinessRuleException("This quiz is not open yet.");
        }

        if (now > access.EndDateTime)
        {
            throw new BusinessRuleException("The deadline for this quiz has passed.");
        }
    }

    private static void ValidateDeviceId(string deviceId)
    {
        if (string.IsNullOrWhiteSpace(deviceId))
        {
            throw new ValidationAppException(["Device id is required to start a quiz attempt."]);
        }
    }

    private void EnsureStudentRole()
    {
        if (ParseRole(_currentUser.Role) != UserRole.Student)
        {
            throw new ForbiddenAppException("Only students can start or submit quiz attempts.");
        }
    }

    private long RequireStudentId()
    {
        return _currentUser.ProfileId ?? _currentUser.UserId
            ?? throw new ForbiddenAppException("Student profile was not found.");
    }

    private static UserRole ParseRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            throw new AuthenticationAppException("Authentication is required.");
        }

        return Enum.Parse<UserRole>(role, ignoreCase: true);
    }
}
