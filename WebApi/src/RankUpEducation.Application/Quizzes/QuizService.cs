using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Common.Utilities;
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

    Task<SaveQuizAttemptAnswersResponse> SaveAttemptAnswersAsync(
        long quizId,
        long attemptId,
        SaveQuizAttemptAnswersRequest request,
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
    private readonly IQuizAssignmentRepository _assignments;
    private readonly IQuizQuestionRepository _quizQuestions;
    private readonly IQuizAttemptRepository _attempts;
    private readonly ILookupRepository _lookups;
    private readonly IStudentScopeRepository _studentScope;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IUnitOfWork _unitOfWork;

    public QuizService(
        IQuizRepository quizzes,
        IQuizAssignmentRepository assignments,
        IQuizQuestionRepository quizQuestions,
        IQuizAttemptRepository attempts,
        ILookupRepository lookups,
        IStudentScopeRepository studentScope,
        ICurrentUserService currentUser,
        IDateTimeProvider dateTimeProvider,
        IUnitOfWork unitOfWork)
    {
        _quizzes = quizzes;
        _assignments = assignments;
        _quizQuestions = quizQuestions;
        _attempts = attempts;
        _lookups = lookups;
        _studentScope = studentScope;
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
            UserRole.PortalAdmin => await _quizzes.ListForSchoolAsync(
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

        if (role is UserRole.Teacher or UserRole.SchoolAdmin or UserRole.PortalAdmin or UserRole.Parent)
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
                0,
                0,
                0,
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

        var access = await _assignments.GetAssignmentAccessAsync(quizId, studentId, cancellationToken)
            ?? throw new NotFoundAppException("This quiz is not assigned to you.");

        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("This quiz is not assigned to you.");

        if (!quiz.IsActive)
        {
            throw new BusinessRuleException("This quiz is no longer available.");
        }

        var now = _dateTimeProvider.UtcNow;
        EnsureAttemptWindow(access, now);

        var inProgressStatusId = await _lookups.ResolveLookupIdAsync(
            AttemptStatusType,
            InProgressStatusName,
            fallback: 1,
            cancellationToken);

        var existingInProgress = await _attempts.GetInProgressAttemptAsync(
            quizId,
            studentId,
            inProgressStatusId,
            cancellationToken);

        if (existingInProgress is not null)
        {
            return await BuildAttemptPayloadAsync(
                quiz,
                existingInProgress,
                studentId,
                resumed: true,
                cancellationToken);
        }

        if (access.ExistingAttemptCount >= access.AllowedAttempts)
        {
            throw new BusinessRuleException("You have used all allowed attempts for this quiz.");
        }

        var attemptNumber = (short)(access.ExistingAttemptCount + 1);
        var attempt = new QuizAttempt(
            quizId,
            studentId,
            attemptNumber,
            inProgressStatusId,
            request.DeviceId.AsTrimmedString());
        attempt.Begin(inProgressStatusId);

        var quizQuestions = await _quizQuestions.GetQuizQuestionsAsync(quizId, cancellationToken);
        if (quizQuestions.Count == 0)
        {
            throw new BusinessRuleException("This quiz has no active questions.");
        }

        var orderedQuestions = OrderQuestionsForAttempt(quizQuestions, quiz.ShuffleQuestions);
        await _attempts.AddAttemptAsync(attempt, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var attemptQuestions = orderedQuestions
            .Select((question, index) => new QuizAttemptQuestion(attempt.Id, question.QuestionId, (short)(index + 1)))
            .ToArray();

        await _attempts.AddAttemptQuestionsAsync(attemptQuestions, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await BuildAttemptPayloadAsync(
            quiz,
            attempt,
            studentId,
            resumed: false,
            cancellationToken);
    }

    public async Task<SaveQuizAttemptAnswersResponse> SaveAttemptAnswersAsync(
        long quizId,
        long attemptId,
        SaveQuizAttemptAnswersRequest request,
        CancellationToken cancellationToken)
    {
        EnsureStudentRole();
        var studentId = RequireStudentId();

        var attempt = await _attempts.GetAttemptEntityAsync(attemptId, studentId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        if (attempt.QuizId != quizId)
        {
            throw new NotFoundAppException("Quiz attempt was not found.");
        }

        var inProgressStatusId = await _lookups.ResolveLookupIdAsync(
            AttemptStatusType,
            InProgressStatusName,
            fallback: 1,
            cancellationToken);

        if (attempt.StatusId != inProgressStatusId)
        {
            throw new BusinessRuleException("Only in-progress attempts can save draft answers.");
        }

        var access = await _assignments.GetAssignmentAccessAsync(quizId, studentId, cancellationToken)
            ?? throw new NotFoundAppException("This quiz is not assigned to you.");
        EnsureAttemptWindow(access, _dateTimeProvider.UtcNow);

        var answers = request.Answers ?? Array.Empty<SubmitQuizAnswerRequest>();
        var savedCount = 0;

        foreach (var submitted in answers
            .GroupBy(answer => answer.QuestionId)
            .Select(group => group.Last()))
        {
            var attemptQuestion = await _attempts.GetAttemptQuestionEntityAsync(
                attemptId,
                submitted.QuestionId,
                cancellationToken);
            if (attemptQuestion is null)
            {
                continue;
            }

            var selectedOptionIds = QuizAnswerSelection.ResolveSelectedOptionIds(submitted);
            await ReplaceAttemptAnswersAsync(
                attemptQuestion.Id,
                selectedOptionIds,
                submitted.SubmittedText,
                awardedMarks: 0,
                isCorrect: false,
                cancellationToken);

            savedCount++;
        }

        if (request.TimeSpentSeconds is short timeSpent)
        {
            attempt.UpdateTimeSpent((short)Math.Clamp((int)timeSpent, 0, short.MaxValue));
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return new SaveQuizAttemptAnswersResponse(attemptId, savedCount);
    }

    public async Task<QuizAttemptResultResponse> SubmitAttemptAsync(
        long quizId,
        long attemptId,
        SubmitQuizAttemptRequest request,
        CancellationToken cancellationToken)
    {
        EnsureStudentRole();
        var studentId = RequireStudentId();

        var attempt = await _attempts.GetAttemptEntityAsync(attemptId, studentId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        if (attempt.QuizId != quizId)
        {
            throw new NotFoundAppException("Quiz attempt was not found.");
        }

        var submittedStatusId = await _lookups.ResolveLookupIdAsync(
            AttemptStatusType,
            SubmittedStatusName,
            fallback: 2,
            cancellationToken);

        if (attempt.StatusId == submittedStatusId)
        {
            throw new BusinessRuleException("This quiz attempt has already been submitted.");
        }

        var quizQuestions = await _quizQuestions.GetQuizQuestionsAsync(quizId, cancellationToken);
        var questionMap = quizQuestions.ToDictionary(question => question.QuestionId);
        var totalMarks = (short)quizQuestions.Sum(question => question.Marks);
        short obtainedMarks = 0;

        var attemptDetail = await _attempts.GetAttemptDetailAsync(attemptId, studentId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        var answersByQuestionId = request.Answers
            .GroupBy(answer => answer.QuestionId)
            .ToDictionary(group => group.Key, group => group.Last());

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

            var selectedOptionIds = QuizAnswerSelection.ResolveSelectedOptionIds(submitted);
            var isCorrect = false;
            short awardedMarks = 0;
            var isMultiSelect = QuizQuestionHelper.IsMultiSelectType(question.QuestionTypeName);
            var isFillBlank = QuizQuestionHelper.IsFillBlankType(question.QuestionTypeName);
            var isDescriptive = QuizQuestionHelper.IsDescriptiveType(question.QuestionTypeName)
                || (!isFillBlank
                    && selectedOptionIds.Count == 0
                    && submitted.SubmittedText.HasTrimmedText());

            if (isMultiSelect && selectedOptionIds.Count > 0)
            {
                var correctOptionIds = question.Options
                    .Where(option => option.IsCorrect)
                    .Select(option => option.OptionId)
                    .ToArray();
                (isCorrect, awardedMarks) = QuizAnswerSelection.ScoreMultiSelect(
                    selectedOptionIds,
                    correctOptionIds,
                    question.Marks);
                obtainedMarks += awardedMarks;
            }
            else if (isFillBlank && submitted.SubmittedText.HasTrimmedText())
            {
                var submittedText = submitted.SubmittedText.AsTrimmedString();
                isCorrect = question.AcceptedAnswers.Any(answer => MatchesAcceptedAnswer(answer, submittedText))
                    || question.Options.Any(option =>
                        option.IsCorrect
                        && string.Equals(
                            option.OptionText.AsTrimmedString(),
                            submittedText,
                            StringComparison.OrdinalIgnoreCase));
                awardedMarks = isCorrect ? question.Marks : (short)0;
                obtainedMarks += awardedMarks;
            }
            else if (selectedOptionIds.Count > 0)
            {
                var selectedOptionId = selectedOptionIds[0];
                var selectedOption = question.Options.FirstOrDefault(option => option.OptionId == selectedOptionId);
                isCorrect = selectedOption?.IsCorrect ?? false;
                awardedMarks = isCorrect ? question.Marks : (short)0;
                obtainedMarks += awardedMarks;
            }
            else if (isDescriptive)
            {
                hasSubjectiveAnswers = true;
            }

            await ReplaceAttemptAnswersAsync(
                attemptQuestion.AttemptQuestionId,
                selectedOptionIds,
                submitted.SubmittedText,
                awardedMarks,
                isCorrect,
                cancellationToken);
        }

        attempt.MarkSubmitted(
            submittedStatusId,
            obtainedMarks,
            totalMarks,
            (short)Math.Clamp((int)request.TimeSpentSeconds, 0, short.MaxValue));

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var quizTitle = (await _quizzes.GetDetailForStudentAsync(quizId, studentId, cancellationToken))?.QuizTitle
            ?? "Quiz";

        var result = await _attempts.GetAttemptDetailAsync(attemptId, studentId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        var reviewState = await _assignments.GetAssignmentReviewStateAsync(quizId, studentId, cancellationToken);
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
        var studentId = await ResolveResultViewerStudentIdAsync(quizId, attemptId, cancellationToken);

        var result = await _attempts.GetAttemptDetailAsync(attemptId, studentId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        if (result.QuizId != quizId)
        {
            throw new NotFoundAppException("Quiz attempt was not found.");
        }

        var quizTitle = (await _quizzes.GetDetailForStudentAsync(quizId, studentId, cancellationToken))?.QuizTitle
            ?? "Quiz";

        var reviewState = await _assignments.GetAssignmentReviewStateAsync(quizId, studentId, cancellationToken);
        var maskPendingReview = reviewState is { IsReviewRequired: true, IsReviewDone: false };

        return QuizMapping.ToAttemptResult(
            result,
            quizTitle,
            reviewAvailable: reviewState?.IsReviewDone ?? true,
            maskPendingReview: maskPendingReview,
            resultStatusOverride: maskPendingReview ? "Pending Review" : null);
    }

    private async Task<StartQuizAttemptResponse> BuildAttemptPayloadAsync(
        Quiz quiz,
        QuizAttempt attempt,
        long studentId,
        bool resumed,
        CancellationToken cancellationToken)
    {
        var quizDetail = await _quizzes.GetDetailForStudentAsync(quiz.Id, studentId, cancellationToken);
        var attemptDetail = await _attempts.GetAttemptDetailAsync(attempt.Id, studentId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        var bankQuestions = await _quizQuestions.GetQuizQuestionsAsync(quiz.Id, cancellationToken);
        var bankById = bankQuestions.ToDictionary(question => question.QuestionId);

        var questions = attemptDetail.Questions
            .OrderBy(question => question.DisplayOrder)
            .Select(attemptQuestion =>
            {
                if (!bankById.TryGetValue(attemptQuestion.QuestionId, out var bankQuestion))
                {
                    return new QuizQuestionForAttemptResponse(
                        attemptQuestion.QuestionId,
                        attemptQuestion.QuestionText,
                        "Unknown",
                        attemptQuestion.Marks,
                        attemptQuestion.DisplayOrder,
                        null,
                        Array.Empty<QuizOptionResponse>());
                }

                var isFillBlank = QuizQuestionHelper.IsFillBlankType(bankQuestion.QuestionTypeName);
                var options = isFillBlank
                    ? new List<QuizOptionResponse>()
                    : bankQuestion.Options
                        .Select(option => new QuizOptionResponse(
                            option.OptionId,
                            option.OptionText,
                            option.OptionImageUrl))
                        .ToList();

                if (!isFillBlank && quiz.ShuffleOptions && options.Count > 1)
                {
                    options = options.OrderBy(_ => Random.Shared.Next()).ToList();
                }

                return new QuizQuestionForAttemptResponse(
                    bankQuestion.QuestionId,
                    bankQuestion.QuestionText,
                    bankQuestion.QuestionTypeName,
                    bankQuestion.Marks,
                    attemptQuestion.DisplayOrder,
                    bankQuestion.Hint,
                    options);
            })
            .ToArray();

        var savedAnswers = attemptDetail.Questions
            .Where(question =>
                question.SelectedOptionIds.Count > 0
                || question.SelectedOptionId is not null
                || question.SubmittedText.HasTrimmedText())
            .Select(question => new SavedQuizAnswerResponse(
                question.QuestionId,
                question.SelectedOptionId,
                question.SubmittedText,
                question.SelectedOptionIds))
            .ToArray();

        return new StartQuizAttemptResponse(
            attempt.Id,
            quiz.Id,
            attempt.NumberOfQuestionAttempt,
            quizDetail?.TimeLimitMinutes,
            attempt.StartedDate,
            resumed,
            questions,
            savedAnswers);
    }

    private async Task ReplaceAttemptAnswersAsync(
        long attemptQuestionId,
        IReadOnlyList<long> selectedOptionIds,
        string? submittedText,
        short awardedMarks,
        bool isCorrect,
        CancellationToken cancellationToken)
    {
        await _attempts.RemoveAttemptAnswersAsync(attemptQuestionId, cancellationToken);

        if (selectedOptionIds.Count == 0 && !submittedText.HasTrimmedText())
        {
            return;
        }

        if (selectedOptionIds.Count == 0)
        {
            var textAnswer = new QuizAttemptAnswer(attemptQuestionId, null, submittedText);
            if (awardedMarks > 0 || isCorrect)
            {
                textAnswer.Mark(awardedMarks, isCorrect);
            }

            await _attempts.AddAttemptAnswersAsync([textAnswer], cancellationToken);
            return;
        }

        var answerRows = selectedOptionIds
            .Select((optionId, index) =>
            {
                var row = new QuizAttemptAnswer(
                    attemptQuestionId,
                    optionId,
                    index == 0 ? submittedText : null);
                if (index == 0 && (awardedMarks > 0 || isCorrect))
                {
                    row.Mark(awardedMarks, isCorrect);
                }

                return row;
            })
            .ToArray();

        await _attempts.AddAttemptAnswersAsync(answerRows, cancellationToken);
    }

    private static List<QuizQuestionItem> OrderQuestionsForAttempt(
        IReadOnlyList<QuizQuestionItem> questions,
        bool shuffleQuestions)
        => QuizQuestionOrder.OrderForAttempt(
            questions,
            question => question.DisplayOrder,
            shuffleQuestions).ToList();

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

        var studentIds = await _studentScope.GetLinkedStudentIdsAsync(parentId, cancellationToken);
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

    private async Task<long> ResolveResultViewerStudentIdAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken)
    {
        var role = ParseRole(_currentUser.Role);

        if (role == UserRole.Student)
        {
            return RequireStudentId();
        }

        if (role != UserRole.Parent)
        {
            throw new ForbiddenAppException("Only students and linked parents can view quiz attempt results.");
        }

        var attempt = await _attempts.GetAttemptEntityByIdAsync(attemptId, quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        var parentId = _currentUser.ProfileId ?? _currentUser.UserId
            ?? throw new ForbiddenAppException("Parent profile was not found.");

        if (!await _studentScope.IsLinkedStudentAsync(parentId, attempt.StudentId, cancellationToken))
        {
            throw new ForbiddenAppException("You can only view results for linked students.");
        }

        return attempt.StudentId;
    }

    private long RequireStudentId()
    {
        return _currentUser.ProfileId ?? _currentUser.UserId
            ?? throw new ForbiddenAppException("Student profile was not found.");
    }

    private static bool MatchesAcceptedAnswer(QuestionAcceptedAnswerScoreItem answer, string submittedText)
    {
        if (answer.MinimumLength > 0 && submittedText.Length < answer.MinimumLength)
        {
            return false;
        }

        if (answer.MaximumLength > 0 && submittedText.Length > answer.MaximumLength)
        {
            return false;
        }

        if (answer.AllowPartialMatch)
        {
            return answer.IsCaseSensitive
                ? submittedText.Contains(answer.AnswerText, StringComparison.Ordinal)
                    || answer.AnswerText.Contains(submittedText, StringComparison.Ordinal)
                : submittedText.Contains(answer.AnswerText, StringComparison.OrdinalIgnoreCase)
                    || answer.AnswerText.Contains(submittedText, StringComparison.OrdinalIgnoreCase);
        }

        return answer.IsCaseSensitive
            ? string.Equals(answer.AnswerText, submittedText, StringComparison.Ordinal)
            : string.Equals(answer.NormalizedAnswer, submittedText.AsLowercase(), StringComparison.Ordinal);
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
