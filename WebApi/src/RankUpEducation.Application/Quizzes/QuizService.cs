using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Notifications;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Contracts.Quizzes;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

/// <summary>
/// Student-facing quiz service: role-scoped listing, attempt lifecycle (start/save/submit),
/// auto-scoring, and masked results while subjective review is pending.
/// </summary>
public interface IQuizService
{
    /// <summary>Lists quizzes visible to the caller (assignments for students, campus scope for teachers, etc.).</summary>
    Task<QuizListResponse> ListAsync(
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken);

    /// <summary>Returns quiz metadata and attempt rules; students see assignment-scoped detail only.</summary>
    Task<QuizDetailResponse> GetDetailAsync(long quizId, CancellationToken cancellationToken);

    /// <summary>Starts or resumes an in-progress attempt within the assignment window and attempt limit.</summary>
    Task<StartQuizAttemptResponse> StartAttemptAsync(
        long quizId,
        StartQuizAttemptRequest request,
        CancellationToken cancellationToken);

    /// <summary>Persists draft answers for an in-progress attempt without scoring or submitting.</summary>
    Task<SaveQuizAttemptAnswersResponse> SaveAttemptAnswersAsync(
        long quizId,
        long attemptId,
        SaveQuizAttemptAnswersRequest request,
        CancellationToken cancellationToken);

    /// <summary>Scores objective answers, flags subjective items for review, and finalizes submission.</summary>
    Task<QuizAttemptResultResponse> SubmitAttemptAsync(
        long quizId,
        long attemptId,
        SubmitQuizAttemptRequest request,
        CancellationToken cancellationToken);

    /// <summary>Returns attempt results; masks scores when review is required but not yet finalized.</summary>
    Task<QuizAttemptResultResponse> GetAttemptResultAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken);
}

/// <inheritdoc cref="IQuizService"/>
public sealed class QuizService : IQuizService
{
    private const string AttemptStatusType = QuizLookupNames.QuizAttemptStatus;
    private const string InProgressStatusName = "InProgress";
    private const string SubmittedStatusName = "Submitted";

    private readonly IQuizRepository _quizzes;
    private readonly IQuizAssignmentRepository _assignments;
    private readonly IQuizQuestionRepository _quizQuestions;
    private readonly IQuizAttemptRepository _attempts;
    private readonly IQuizReviewRepository _reviews;
    private readonly ILookupRepository _lookups;
    private readonly IStudentScopeRepository _studentScope;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IQuizAiReviewService _aiReview;
    private readonly INotificationService _notifications;

    public QuizService(
        IQuizRepository quizzes,
        IQuizAssignmentRepository assignments,
        IQuizQuestionRepository quizQuestions,
        IQuizAttemptRepository attempts,
        IQuizReviewRepository reviews,
        ILookupRepository lookups,
        IStudentScopeRepository studentScope,
        ICurrentUserService currentUser,
        IDateTimeProvider dateTimeProvider,
        IUnitOfWork unitOfWork,
        IQuizAiReviewService aiReview,
        RankUpEducation.Application.Notifications.INotificationService notifications)
    {
        _quizzes = quizzes;
        _assignments = assignments;
        _quizQuestions = quizQuestions;
        _attempts = attempts;
        _reviews = reviews;
        _lookups = lookups;
        _studentScope = studentScope;
        _currentUser = currentUser;
        _dateTimeProvider = dateTimeProvider;
        _unitOfWork = unitOfWork;
        _aiReview = aiReview;
        _notifications = notifications;
    }

    public async Task<QuizListResponse> ListAsync(
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken)
    {
        var role = ParseRole(_currentUser.Role);
        var now = _dateTimeProvider.UtcNow;

        if (role is UserRole.Student or UserRole.Parent or UserRole.Teacher)
        {
            var expired = await _assignments.ExpireOverdueUnattemptedAsync(now, cancellationToken);
            if (expired > 0)
            {
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
        }

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
            // Non-student viewers without creator detail fall back to list summary fields.
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
                "Free",
                0,
                summary.ResultPercent,
                summary.CompletedAt,
                0,
                0,
                0,
                0,
                0,
                summary.Status,
                summary.ResultStatus);

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

        var quizTypeName = await _lookups.GetLookupNameAsync(quiz.QuizTypeId, cancellationToken);
        if (quizTypeName.Equals("Competition", StringComparison.OrdinalIgnoreCase)
            && quiz.TimeLimitMinutes is null or <= 0)
        {
            throw new BusinessRuleException("Competition quizzes require a time limit.");
        }

        if (access.AssignmentId == 0)
        {
            var resultStatusId = await _lookups.ResolveLookupIdAsync(
                QuizLookupNames.QuizResultStatus,
                "Not Attempted",
                fallback: QuizLookupNames.QuizResultStatusIds.NotAttempted,
                cancellationToken);
            var materialized = new QuizAssignment(
                quizId,
                studentId,
                studentId,
                access.StartDateTime,
                access.EndDateTime,
                access.AllowedAttempts,
                resultStatusId);
            await _assignments.AddAssignmentsAsync([materialized], cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            access = await _assignments.GetAssignmentAccessAsync(quizId, studentId, cancellationToken)
                ?? throw new NotFoundAppException("This quiz is not assigned to you.");
        }

        var now = _dateTimeProvider.UtcNow;

        var inProgressStatusId = await _lookups.ResolveLookupIdAsync(
            AttemptStatusType,
            InProgressStatusName,
            fallback: QuizLookupNames.QuizAttemptStatusIds.InProgress,
            cancellationToken);

        var existingInProgress = await _attempts.GetInProgressAttemptAsync(
            quizId,
            studentId,
            inProgressStatusId,
            cancellationToken);

        await EnsureAttemptWindowAsync(access, now, existingInProgress, cancellationToken);

        if (existingInProgress is not null)
        {
            await EnsureCompetitionDeviceLockAsync(quiz, existingInProgress, cancellationToken, request.DeviceId);
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
            .Select((question, index) => new QuizAttemptQuestion(
                attempt.Id,
                question.QuestionId,
                (short)(index + 1),
                question.Marks,
                question.QuestionText,
                question.QuestionTypeName,
                question.Hint,
                question.Explanation,
                question.EstimatedTimeSeconds))
            .ToArray();

        await _attempts.AddAttemptQuestionsAsync(attemptQuestions, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var snapshotOptions = new List<QuizAttemptQuestionOption>();
        var snapshotAccepted = new List<QuizAttemptAcceptedAnswer>();
        foreach (var attemptQuestion in attemptQuestions)
        {
            var source = orderedQuestions.First(question => question.QuestionId == attemptQuestion.QuestionId);
            var options = source.Options.ToList();
            if (!QuizQuestionHelper.IsFillBlankType(source.QuestionTypeName)
                && quiz.ShuffleOptions
                && options.Count > 1)
            {
                options = options.OrderBy(_ => Random.Shared.Next()).ToList();
            }

            short optionOrder = 1;
            foreach (var option in options)
            {
                snapshotOptions.Add(new QuizAttemptQuestionOption(
                    attemptQuestion.Id,
                    option.OptionId,
                    option.OptionText,
                    option.OptionImageUrl,
                    option.IsCorrect,
                    optionOrder++));
            }

            foreach (var accepted in source.AcceptedAnswers)
            {
                snapshotAccepted.Add(new QuizAttemptAcceptedAnswer(
                    attemptQuestion.Id,
                    accepted.AnswerText,
                    accepted.IsCaseSensitive,
                    accepted.AllowPartialMatch,
                    accepted.NormalizedAnswer,
                    accepted.MinimumLength,
                    accepted.MaximumLength,
                    accepted.AllowAiReview,
                    accepted.AllowTeacherReview));
            }
        }

        if (snapshotOptions.Count > 0)
        {
            await _attempts.AddAttemptQuestionOptionsAsync(snapshotOptions, cancellationToken);
        }

        if (snapshotAccepted.Count > 0)
        {
            await _attempts.AddAttemptAcceptedAnswersAsync(snapshotAccepted, cancellationToken);
        }

        var assignment = await _assignments.GetAssignmentEntityAsync(quizId, studentId, cancellationToken);
        if (assignment is not null
            && (assignment.QuizResultStatus == QuizLookupNames.QuizResultStatusIds.NotAttempted
                || assignment.QuizResultStatus == QuizLookupNames.QuizResultStatusIds.Upcoming
                || assignment.QuizResultStatus == QuizLookupNames.QuizResultStatusIds.Expired))
        {
            var inProgressResultId = await _lookups.ResolveLookupIdAsync(
                QuizLookupNames.QuizResultStatus,
                "In Progress",
                fallback: QuizLookupNames.QuizResultStatusIds.InProgress,
                cancellationToken);
            assignment.SetResultStatus(inProgressResultId);
        }

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
            fallback: QuizLookupNames.QuizAttemptStatusIds.InProgress,
            cancellationToken);

        if (attempt.StatusId != inProgressStatusId)
        {
            throw new BusinessRuleException("Only in-progress attempts can save draft answers.");
        }

        var access = await _assignments.GetAssignmentAccessAsync(quizId, studentId, cancellationToken)
            ?? throw new NotFoundAppException("This quiz is not assigned to you.");
        var now = _dateTimeProvider.UtcNow;
        await EnsureAttemptWindowAsync(access, now, attempt, cancellationToken);

        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");
        await EnsureCompetitionDeviceLockAsync(quiz, attempt, cancellationToken, request.DeviceId);
        EnsureAttemptTimeBudget(quiz.TimeLimitMinutes, attempt.StartedDate, now, graceSeconds: 30);

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

            if (attemptQuestion.EstimatedTimeSeconds > 0
                && submitted.TimeSpentSeconds is short questionSpent
                && questionSpent > attemptQuestion.EstimatedTimeSeconds + 5)
            {
                // Soft enforce: keep last valid answer time; still accept draft but clamp reported time.
                attemptQuestion.UpdateTimeSpent(attemptQuestion.EstimatedTimeSeconds);
            }
            else if (submitted.TimeSpentSeconds is short spent)
            {
                attemptQuestion.UpdateTimeSpent(spent);
            }

            var selectedOptionIds = QuizAnswerSelection.ResolveSelectedOptionIds(submitted);
            if (submitted.IsMarkedForReview is bool marked)
            {
                attemptQuestion.SetMarkedForReview(marked);
            }

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

        if (request.FocusLossDelta is > 0)
        {
            for (var i = 0; i < request.FocusLossDelta.Value && i < 50; i++)
            {
                attempt.RecordFocusLoss();
            }
        }

        if (request.ClipboardPasteDelta is > 0)
        {
            for (var i = 0; i < request.ClipboardPasteDelta.Value && i < 50; i++)
            {
                attempt.RecordClipboardPaste();
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return new SaveQuizAttemptAnswersResponse(
            attemptId,
            savedCount,
            attempt.FocusLossCount,
            attempt.ClipboardPasteCount);
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

        var access = await _assignments.GetAssignmentAccessAsync(quizId, studentId, cancellationToken)
            ?? throw new NotFoundAppException("This quiz is not assigned to you.");
        var now = _dateTimeProvider.UtcNow;
        await EnsureAttemptWindowAsync(access, now, attempt, cancellationToken);

        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");
        await EnsureCompetitionDeviceLockAsync(quiz, attempt, cancellationToken, request.DeviceId);
        // Auto-submit after client timer expiry may arrive slightly late; give a wider grace than manual submit.
        EnsureAttemptTimeBudget(
            quiz.TimeLimitMinutes,
            attempt.StartedDate,
            now,
            graceSeconds: request.IsAutoSubmit ? 90 : 15);

        var submittedStatusName = request.IsAutoSubmit ? "AutoSubmitted" : SubmittedStatusName;
        var submittedStatusFallback = request.IsAutoSubmit
            ? QuizLookupNames.QuizAttemptStatusIds.AutoSubmitted
            : QuizLookupNames.QuizAttemptStatusIds.Submitted;
        var submittedStatusId = await _lookups.ResolveLookupIdAsync(
            AttemptStatusType,
            submittedStatusName,
            fallback: submittedStatusFallback,
            cancellationToken);

        var statusName = await _lookups.GetLookupNameAsync(attempt.StatusId, cancellationToken);
        var alreadySubmitted =
            attempt.StatusId == QuizLookupNames.QuizAttemptStatusIds.Submitted
            || attempt.StatusId == QuizLookupNames.QuizAttemptStatusIds.AutoSubmitted
            || attempt.StatusId == QuizLookupNames.QuizAttemptStatusIds.Reviewed
            || string.Equals(statusName, "Submitted", StringComparison.OrdinalIgnoreCase)
            || string.Equals(statusName, "AutoSubmitted", StringComparison.OrdinalIgnoreCase)
            || string.Equals(statusName, "Reviewed", StringComparison.OrdinalIgnoreCase);
        if (alreadySubmitted)
        {
            throw new BusinessRuleException("This quiz attempt has already been submitted.");
        }

        var attemptDetail = await _attempts.GetAttemptDetailAsync(attemptId, studentId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");
        var totalMarks = (short)attemptDetail.Questions.Sum(question => question.Marks);
        short obtainedMarks = 0;

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

            var attemptQuestionEntity = await _attempts.GetAttemptQuestionEntityAsync(
                attemptId,
                attemptQuestion.QuestionId,
                cancellationToken);
            if (attemptQuestionEntity is not null)
            {
                if (submitted.IsMarkedForReview is bool marked)
                {
                    attemptQuestionEntity.SetMarkedForReview(marked);
                }

                if (submitted.TimeSpentSeconds is short spent)
                {
                    attemptQuestionEntity.UpdateTimeSpent(spent);
                }
            }

            var questionMarks = attemptQuestion.Marks;
            var selectedOptionIds = QuizAnswerSelection.ResolveSelectedOptionIds(submitted);
            var isCorrect = false;
            short awardedMarks = 0;
            var typeName = attemptQuestion.QuestionTypeName;
            var isMultiSelect = QuizQuestionHelper.IsMultiSelectType(typeName);
            var isFillBlank = QuizQuestionHelper.IsFillBlankType(typeName);
            var isDescriptive = QuizQuestionHelper.IsDescriptiveType(typeName)
                || (!isFillBlank
                    && selectedOptionIds.Count == 0
                    && submitted.SubmittedText.HasTrimmedText());
            var acceptedAnswers = attemptQuestion.AcceptedAnswers
                ?? Array.Empty<QuestionAcceptedAnswerScoreItem>();

            if (isMultiSelect && selectedOptionIds.Count > 0)
            {
                var correctOptionIds = attemptQuestion.Options
                    .Where(option => option.IsCorrect)
                    .Select(option => option.OptionId)
                    .ToArray();
                (isCorrect, awardedMarks) = QuizAnswerSelection.ScoreMultiSelect(
                    selectedOptionIds,
                    correctOptionIds,
                    questionMarks);
                obtainedMarks += awardedMarks;
            }
            else if (isFillBlank && submitted.SubmittedText.HasTrimmedText())
            {
                var submittedText = submitted.SubmittedText.AsTrimmedString();
                isCorrect = acceptedAnswers.Any(answer => MatchesAcceptedAnswer(answer, submittedText))
                    || attemptQuestion.Options.Any(option =>
                        option.IsCorrect
                        && string.Equals(
                            option.OptionText.AsTrimmedString(),
                            submittedText,
                            StringComparison.OrdinalIgnoreCase));
                awardedMarks = isCorrect ? questionMarks : (short)0;
                obtainedMarks += awardedMarks;

                var allowTeacherReview = acceptedAnswers.Any(answer => answer.AllowTeacherReview);
                var allowAiReview = acceptedAnswers.Any(answer => answer.AllowAiReview);
                if (allowTeacherReview)
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

                if (allowAiReview)
                {
                    await EnsureFillAiReviewAsync(
                        attemptId,
                        attemptQuestion.QuestionId,
                        bankQuestionText: attemptQuestion.QuestionText,
                        submittedText: submitted.SubmittedText ?? string.Empty,
                        isCorrect,
                        awardedMarks,
                        questionMarks,
                        acceptedAnswers.Select(answer => answer.AnswerText).ToArray(),
                        cancellationToken);
                }

                continue;
            }
            else if (selectedOptionIds.Count > 0)
            {
                var selectedOptionId = selectedOptionIds[0];
                var selectedOption = attemptQuestion.Options.FirstOrDefault(option => option.OptionId == selectedOptionId);
                isCorrect = selectedOption?.IsCorrect ?? false;
                awardedMarks = isCorrect ? questionMarks : (short)0;
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

        var reviewState = await _assignments.GetAssignmentReviewStateAsync(quizId, studentId, cancellationToken);
        // Hide auto-score from student until teacher finalizes when quiz requires review and subjective answers exist.
        var maskPendingReview = reviewState is { IsReviewRequired: true, IsReviewDone: false } && hasSubjectiveAnswers;

        var quizTypeNameForResult = await _lookups.GetLookupNameAsync(quiz.QuizTypeId, cancellationToken);
        var showAnswers = QuizTypeBehavior.ShouldShowAnswersAfterSubmit(quizTypeNameForResult, maskPendingReview);

        var assignment = await _assignments.GetAssignmentEntityAsync(quizId, studentId, cancellationToken);
        if (assignment is not null)
        {
            var resultStatusId = await _lookups.ResolveLookupIdAsync(
                QuizLookupNames.QuizResultStatus,
                maskPendingReview ? "Under Review" : "Completed",
                fallback: maskPendingReview
                    ? QuizLookupNames.QuizResultStatusIds.UnderReview
                    : QuizLookupNames.QuizResultStatusIds.Completed,
                cancellationToken);
            assignment.SetResultStatus(resultStatusId);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var quizTitle = (await _quizzes.GetDetailForStudentAsync(quizId, studentId, cancellationToken))?.QuizTitle
            ?? "Quiz";

        if (assignment is not null)
        {
            var category = request.IsAutoSubmit
                ? QuizNotificationCategories.QuizAutoSubmitted
                : QuizNotificationCategories.QuizSubmitted;
            await _notifications.CreateAsync(
                [assignment.AssignedById],
                request.IsAutoSubmit ? "Quiz auto-submitted" : "Quiz submitted",
                $"A student submitted \"{quizTitle}\" (attempt #{attempt.NumberOfQuestionAttempt}).",
                category,
                cancellationToken);
        }

        var result = await _attempts.GetAttemptDetailAsync(attemptId, studentId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        return QuizMapping.ToAttemptResult(
            result,
            quizTitle,
            reviewAvailable: showAnswers,
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
        var hasSubjectiveAnswers = QuizQuestionHelper.HasSubjectiveAnswersRequiringReview(result.Questions);
        var maskPendingReview = reviewState is { IsReviewRequired: true, IsReviewDone: false }
            && hasSubjectiveAnswers;

        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken);
        var quizTypeName = quiz is null
            ? string.Empty
            : await _lookups.GetLookupNameAsync(quiz.QuizTypeId, cancellationToken);
        var showAnswers = QuizTypeBehavior.ShouldShowAnswersAfterSubmit(quizTypeName, maskPendingReview);

        return QuizMapping.ToAttemptResult(
            result,
            quizTitle,
            reviewAvailable: showAnswers,
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

        var quizTypeName = await _lookups.GetLookupNameAsync(quiz.QuizTypeId, cancellationToken);
        var isCompetition = quizTypeName.Equals("Competition", StringComparison.OrdinalIgnoreCase);
        var enablePerQuestionTimer = attemptDetail.Questions.Any(question => question.EstimatedTimeSeconds > 0);

        var questions = attemptDetail.Questions
            .OrderBy(question => question.DisplayOrder)
            .Select(attemptQuestion =>
            {
                var isFillBlank = QuizQuestionHelper.IsFillBlankType(attemptQuestion.QuestionTypeName);
                var options = isFillBlank
                    ? Array.Empty<QuizOptionResponse>()
                    : attemptQuestion.Options
                        .Select(option => new QuizOptionResponse(
                            option.OptionId,
                            option.OptionText,
                            option.OptionImageUrl))
                        .ToArray();

                return new QuizQuestionForAttemptResponse(
                    attemptQuestion.QuestionId,
                    attemptQuestion.QuestionText,
                    string.IsNullOrWhiteSpace(attemptQuestion.QuestionTypeName)
                        ? "Unknown"
                        : attemptQuestion.QuestionTypeName,
                    attemptQuestion.Marks,
                    attemptQuestion.DisplayOrder,
                    attemptQuestion.Hint,
                    options,
                    attemptQuestion.EstimatedTimeSeconds,
                    attemptQuestion.TimeSpentSeconds);
            })
            .ToArray();

        var savedAnswers = attemptDetail.Questions
            .Where(question =>
                question.SelectedOptionIds.Count > 0
                || question.SelectedOptionId is not null
                || question.SubmittedText.HasTrimmedText()
                || question.IsMarkedForReview)
            .Select(question => new SavedQuizAnswerResponse(
                question.QuestionId,
                question.SelectedOptionId,
                question.SubmittedText,
                question.SelectedOptionIds,
                question.IsMarkedForReview))
            .ToArray();

        return new StartQuizAttemptResponse(
            attempt.Id,
            quiz.Id,
            attempt.NumberOfQuestionAttempt,
            quizDetail?.TimeLimitMinutes ?? quiz.TimeLimitMinutes,
            attempt.StartedDate,
            resumed,
            questions,
            savedAnswers,
            string.IsNullOrWhiteSpace(quiz.NavigationMode) ? "Free" : quiz.NavigationMode,
            EnforceDeviceLock: isCompetition,
            FocusLossCount: attempt.FocusLossCount,
            ClipboardPasteCount: attempt.ClipboardPasteCount,
            EnablePerQuestionTimer: enablePerQuestionTimer);
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

    private async Task EnsureAttemptWindowAsync(
        QuizAssignmentAccess access,
        DateTimeOffset now,
        QuizAttempt? inProgressAttempt,
        CancellationToken cancellationToken)
    {
        if (now < access.StartDateTime)
        {
            throw new BusinessRuleException("This quiz is not open yet.");
        }

        if (now <= access.EndDateTime)
        {
            return;
        }

        if (inProgressAttempt is not null
            && inProgressAttempt.StatusId == QuizLookupNames.QuizAttemptStatusIds.InProgress)
        {
            inProgressAttempt.MarkExpired(QuizLookupNames.QuizAttemptStatusIds.Expired);
            var assignment = await _assignments.GetAssignmentEntityAsync(
                inProgressAttempt.QuizId,
                inProgressAttempt.StudentId,
                cancellationToken);
            if (assignment is not null
                && assignment.QuizResultStatus is QuizLookupNames.QuizResultStatusIds.InProgress
                    or QuizLookupNames.QuizResultStatusIds.NotAttempted
                    or QuizLookupNames.QuizResultStatusIds.Upcoming)
            {
                assignment.SetResultStatus(QuizLookupNames.QuizResultStatusIds.Expired);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        throw new BusinessRuleException("The deadline for this quiz has passed.");
    }

    /// <summary>
    /// Soft client countdown is backed by a hard server budget with a small grace for clock skew / network latency.
    /// </summary>
    private static void EnsureAttemptTimeBudget(
        short? timeLimitMinutes,
        DateTimeOffset startedAt,
        DateTimeOffset now,
        int graceSeconds)
    {
        if (timeLimitMinutes is null or <= 0)
        {
            return;
        }

        var budget = TimeSpan.FromMinutes(timeLimitMinutes.Value) + TimeSpan.FromSeconds(graceSeconds);
        if (now - startedAt > budget)
        {
            throw new BusinessRuleException("The time limit for this quiz attempt has expired.");
        }
    }

    private async Task EnsureCompetitionDeviceLockAsync(
        Quiz quiz,
        QuizAttempt attempt,
        CancellationToken cancellationToken,
        string? deviceId = null)
    {
        var quizTypeName = await _lookups.GetLookupNameAsync(quiz.QuizTypeId, cancellationToken);
        if (!quizTypeName.Equals("Competition", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (!deviceId.HasTrimmedText())
        {
            throw new ValidationAppException(["Device id is required for competition attempts."]);
        }

        attempt.EnsureSameDevice(deviceId!);
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

    private async Task EnsureFillAiReviewAsync(
        long attemptId,
        long questionId,
        string bankQuestionText,
        string submittedText,
        bool isCorrect,
        short awardedMarks,
        short maxMarks,
        IReadOnlyList<string> acceptedAnswers,
        CancellationToken cancellationToken)
    {
        var attemptQuestion = await _attempts.GetAttemptQuestionEntityAsync(
            attemptId,
            questionId,
            cancellationToken);
        if (attemptQuestion is null)
        {
            return;
        }

        var suggestion = await _aiReview.SuggestAsync(
            new QuizAiReviewRequest(
                bankQuestionText,
                submittedText,
                isCorrect,
                awardedMarks,
                maxMarks,
                acceptedAnswers),
            cancellationToken);

        var feedback =
            $"{suggestion.Feedback} (suggested {suggestion.SuggestedMarks}/{maxMarks}"
            + (suggestion.IsCorrect ? ", correct" : ", incorrect")
            + "). Awaiting teacher confirmation when teacher review is required.";

        if (attemptQuestion.QuizReviewId is not null)
        {
            var existing = await _reviews.GetQuestionReviewEntityAsync(
                attemptQuestion.QuizReviewId.Value,
                cancellationToken);
            existing?.SetAiReview(statusId: null, feedback);
            return;
        }

        var review = new QuizReview("AI", quizId: null, questionId: questionId);
        review.SetAiReview(statusId: null, feedback);
        await _reviews.AddReviewAsync(review, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        attemptQuestion.LinkReview(review.Id);
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
