using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Lookups;
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

    /// <summary>
    /// Applies a queued offline draft or submit after reconnect (idempotent via <c>ClientSyncId</c>).
    /// </summary>
    Task<SyncOfflineQuizAttemptResponse> SyncOfflineAttemptAsync(
        long quizId,
        long attemptId,
        SyncOfflineQuizAttemptRequest request,
        CancellationToken cancellationToken);

    /// <summary>Returns attempt results; masks scores when review is required but not yet finalized.</summary>
    Task<QuizAttemptResultResponse> GetAttemptResultAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken);

    /// <summary>Stores a binary file for a File Upload question and returns the public URL/path.</summary>
    Task<UploadQuizAttemptFileResponse> UploadAttemptAnswerFileAsync(
        long quizId,
        long attemptId,
        long attemptQuestionId,
        Stream fileContent,
        string fileName,
        string contentType,
        string deviceId,
        CancellationToken cancellationToken);
}

/// <inheritdoc cref="IQuizService"/>
public sealed class QuizService : IQuizService
{
    private const string AttemptStatusType = LookupNames.QuizAttemptStatus;
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
    private readonly IFileStorageService _fileStorage;

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
        RankUpEducation.Application.Notifications.INotificationService notifications,
        IFileStorageService fileStorage)
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
        _fileStorage = fileStorage;
    }

    public async Task<QuizListResponse> ListAsync(
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken)
    {
        var role = ParseRole(_currentUser.Role);
        var now = _dateTimeProvider.UtcNow;

        if (role is UserRole.Student or UserRole.Parent or UserRole.Teacher or UserRole.Coordinator or UserRole.Tutor)
        {
            var expired = await _assignments.ExpireOverdueUnattemptedAsync(now, cancellationToken);
            if (expired.ChangedCount > 0)
            {
                await _unitOfWork.SaveChangesAsync(cancellationToken);
                await QuizSurpriseNotifications.NotifyNewlyOpenedAsync(
                    _notifications,
                    expired.NewlyOpenedSurpriseAssignments,
                    cancellationToken);
            }
        }

        IReadOnlyList<QuizListItem> items = role switch
        {
            UserRole.Student => await ListForStudentAsync(search, subject, grade, cancellationToken),
            UserRole.Parent => await ListForParentAsync(search, subject, grade, cancellationToken),
            UserRole.Tutor => await ListForTutorAsync(search, subject, grade, cancellationToken),
            UserRole.Teacher or UserRole.Coordinator => await ListForTeacherAsync(search, subject, grade, cancellationToken),
            UserRole.SchoolAdmin => await _quizzes.ListForSchoolAsync(
                _currentUser.SchoolId,
                campusId: null,
                viewerUserId: _currentUser.UserId,
                includeAllDrafts: false,
                includeAllSchools: false,
                search,
                subject,
                grade,
                cancellationToken,
                includePublishedFromAllSchools: true),
            UserRole.CampusAdmin => await _quizzes.ListForSchoolAsync(
                _currentUser.SchoolId,
                _currentUser.CampusId,
                viewerUserId: _currentUser.UserId,
                includeAllDrafts: false,
                includeAllSchools: false,
                search,
                subject,
                grade,
                cancellationToken,
                includePublishedFromAllSchools: true),
            UserRole.PortalAdmin => await _quizzes.ListForSchoolAsync(
                schoolId: null,
                campusId: null,
                viewerUserId: _currentUser.UserId,
                includeAllDrafts: true, // pipeline drafts only — not unsubmitted WIP
                includeAllSchools: true,
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

        if (role is UserRole.Teacher or UserRole.Coordinator or UserRole.Tutor)
        {
            var teacherUserId = _currentUser.UserId ?? throw new ForbiddenAppException("Teacher account was not found.");
            var ownedDetail = await _quizzes.GetDetailForCreatorAsync(quizId, teacherUserId, cancellationToken);
            if (ownedDetail is not null)
            {
                return QuizMapping.ToDetailResponse(ownedDetail, now);
            }
        }

        if (role is UserRole.Teacher or UserRole.Coordinator or UserRole.SchoolAdmin or UserRole.CampusAdmin or UserRole.PortalAdmin or UserRole.Parent or UserRole.Tutor)
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
                LookupNames.QuizResultStatus,
                "Not Attempted",
                fallback: LookupNames.QuizResultStatusIds.NotAttempted,
                cancellationToken);
            var assignedById = ResolvePublicCatalogAssignedById(quiz, studentId);
            var materialized = new QuizAssignment(
                quizId,
                studentId,
                assignedById,
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
            fallback: LookupNames.QuizAttemptStatusIds.InProgress,
            cancellationToken);

        var existingInProgress = await _attempts.GetInProgressAttemptAsync(
            quizId,
            studentId,
            inProgressStatusId,
            cancellationToken);

        await EnsureAttemptWindowAsync(access, now, existingInProgress, cancellationToken);

        if (existingInProgress is not null)
        {
            await EnsureDeviceLockAsync(quiz, existingInProgress, cancellationToken, request.DeviceId);
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

        if (QuizStatusCalculator.ParseInstructions(quiz.Instructions).Count > 0
            && !request.InstructionsAcknowledged)
        {
            throw new ValidationAppException(
                ["You must acknowledge the quiz instructions before starting."]);
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

        var orderedQuestions = QuizQuestionSelection.SelectForAttempt(
            quizQuestions,
            question => question.DisplayOrder,
            quiz.RandomQuestionCount,
            quiz.ShuffleQuestions);
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
            // Option shuffle is controlled only at quiz level.
            var shouldShuffleOptions = quiz.ShuffleOptions
                && !QuizQuestionHelper.IsFillBlankType(source.QuestionTypeName)
                && !QuizQuestionHelper.IsMatchingType(source.QuestionTypeName)
                && !QuizQuestionHelper.IsOrderingType(source.QuestionTypeName)
                && options.Count > 1;
            if (shouldShuffleOptions)
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
            && (assignment.QuizResultStatus == LookupNames.QuizResultStatusIds.NotAttempted
                || assignment.QuizResultStatus == LookupNames.QuizResultStatusIds.Upcoming
                || assignment.QuizResultStatus == LookupNames.QuizResultStatusIds.Expired))
        {
            var inProgressResultId = await _lookups.ResolveLookupIdAsync(
                LookupNames.QuizResultStatus,
                "In Progress",
                fallback: LookupNames.QuizResultStatusIds.InProgress,
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
            fallback: LookupNames.QuizAttemptStatusIds.InProgress,
            cancellationToken);

        if (attempt.StatusId != inProgressStatusId)
        {
            throw new BusinessRuleException("Only in-progress attempts can save draft answers.");
        }

        var access = await _assignments.GetAssignmentAccessAsync(quizId, studentId, cancellationToken)
            ?? throw new NotFoundAppException("This quiz is not assigned to you.");
        var now = _dateTimeProvider.UtcNow;
        await EnsureAttemptWindowAsync(
            access,
            now,
            attempt,
            cancellationToken,
            allowOfflineGrace: request.IsOfflineSync);

        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");
        await EnsureDeviceLockAsync(quiz, attempt, cancellationToken, request.DeviceId);
        QuizIntegrityRules.EnsureDraftAllowed(attempt);
        EnsureAttemptTimeBudget(
            quiz.TimeLimitMinutes,
            attempt.StartedDate,
            now,
            graceSeconds: request.IsOfflineSync ? 120 : 30);

        if (request.IsOfflineSync)
        {
            ApplyOfflineSyncMarker(attempt, request.ClientSyncId);
        }

        // Record integrity telemetry before answer writes so breach can lock further drafts.
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

        if (QuizIntegrityRules.IsBreached(attempt))
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            throw new BusinessRuleException(
                "Integrity limit exceeded (too many focus losses or paste events). Submit your attempt now.");
        }

        var answers = request.Answers ?? Array.Empty<SubmitQuizAnswerRequest>();
        var contentUpdates = answers
            .GroupBy(answer => answer.QuestionId)
            .Where(group => AnswerRequestHasContent(group.Last()))
            .ToDictionary(
                group => group.Key,
                group => true);

        if (contentUpdates.Count > 0)
        {
            var attemptDetail = await _attempts.GetAttemptDetailAsync(attemptId, studentId, cancellationToken)
                ?? throw new NotFoundAppException("Quiz attempt was not found.");
            var navItems = attemptDetail.Questions
                .OrderBy(question => question.DisplayOrder)
                .Select(question => new QuizAttemptQuestionNavItem(
                    question.QuestionId,
                    question.DisplayOrder,
                    HasAttemptAnswer(question)))
                .ToArray();
            QuizNavigationRules.EnsureAnswerUpdatesAllowed(
                quiz.NavigationMode,
                navItems,
                contentUpdates);
        }

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
                && IsPerQuestionTimeExceeded(
                    attemptQuestion.EstimatedTimeSeconds,
                    submitted.TimeSpentSeconds,
                    attemptQuestion.TimeSpentSeconds))
            {
                // Hard reject: do not accept answer changes after the per-question budget.
                attemptQuestion.UpdateTimeSpent(attemptQuestion.EstimatedTimeSeconds);
                continue;
            }

            if (submitted.TimeSpentSeconds is short spent)
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

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return new SaveQuizAttemptAnswersResponse(
            attemptId,
            savedCount,
            attempt.FocusLossCount,
            attempt.ClipboardPasteCount,
            attempt.IsOfflineAttempt,
            attempt.ClientSyncId);
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
        await EnsureAttemptWindowAsync(
            access,
            now,
            attempt,
            cancellationToken,
            allowOfflineGrace: request.IsOfflineSync);

        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");
        await EnsureDeviceLockAsync(quiz, attempt, cancellationToken, request.DeviceId);
        // Auto-submit after client timer expiry may arrive slightly late; give a wider grace than manual submit.
        // Offline reconnect gets additional skew room on top of auto-submit grace.
        var graceSeconds = request.IsAutoSubmit ? 90 : 15;
        if (request.IsOfflineSync)
        {
            graceSeconds = Math.Max(graceSeconds, 180);
        }

        EnsureAttemptTimeBudget(
            quiz.TimeLimitMinutes,
            attempt.StartedDate,
            now,
            graceSeconds);

        if (request.IsOfflineSync)
        {
            ApplyOfflineSyncMarker(attempt, request.ClientSyncId);
        }

        var submittedStatusName = request.IsAutoSubmit ? "AutoSubmitted" : SubmittedStatusName;
        var submittedStatusFallback = request.IsAutoSubmit
            ? LookupNames.QuizAttemptStatusIds.AutoSubmitted
            : LookupNames.QuizAttemptStatusIds.Submitted;
        var submittedStatusId = await _lookups.ResolveLookupIdAsync(
            AttemptStatusType,
            submittedStatusName,
            fallback: submittedStatusFallback,
            cancellationToken);

        var statusName = await _lookups.GetLookupNameAsync(attempt.StatusId, cancellationToken);
        var alreadySubmitted =
            attempt.StatusId == LookupNames.QuizAttemptStatusIds.Submitted
            || attempt.StatusId == LookupNames.QuizAttemptStatusIds.AutoSubmitted
            || attempt.StatusId == LookupNames.QuizAttemptStatusIds.Reviewed
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

        var navItems = attemptDetail.Questions
            .OrderBy(question => question.DisplayOrder)
            .Select(question => new QuizAttemptQuestionNavItem(
                question.QuestionId,
                question.DisplayOrder,
                HasAttemptAnswer(question)))
            .ToArray();
        var navUpdates = answersByQuestionId
            .Where(pair => AnswerRequestHasContent(pair.Value))
            .ToDictionary(pair => pair.Key, _ => true);
        QuizNavigationRules.EnsureAnswerUpdatesAllowed(
            quiz.NavigationMode,
            navItems,
            navUpdates);

        // After integrity breach, submit may finish but must not accept answer mutations.
        var freezeAnswersForIntegrity = QuizIntegrityRules.IsBreached(attempt);

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

            var rejectLateAnswer = attemptQuestion.EstimatedTimeSeconds > 0
                && IsPerQuestionTimeExceeded(
                    attemptQuestion.EstimatedTimeSeconds,
                    submitted.TimeSpentSeconds,
                    attemptQuestion.TimeSpentSeconds);

            var useDraftSnapshot = rejectLateAnswer || freezeAnswersForIntegrity;

            if (attemptQuestionEntity is not null)
            {
                if (!useDraftSnapshot && submitted.IsMarkedForReview is bool marked)
                {
                    attemptQuestionEntity.SetMarkedForReview(marked);
                }

                if (submitted.TimeSpentSeconds is short spent)
                {
                    var capped = rejectLateAnswer
                        ? attemptQuestion.EstimatedTimeSeconds
                        : spent;
                    attemptQuestionEntity.UpdateTimeSpent(capped);
                }
                else if (rejectLateAnswer)
                {
                    attemptQuestionEntity.UpdateTimeSpent(attemptQuestion.EstimatedTimeSeconds);
                }
            }

            // Late / integrity-frozen answers use the last in-budget draft snapshot.
            IReadOnlyList<long> selectedOptionIds;
            string? submittedText;
            if (useDraftSnapshot)
            {
                selectedOptionIds = attemptQuestion.SelectedOptionIds.Count > 0
                    ? attemptQuestion.SelectedOptionIds
                    : attemptQuestion.SelectedOptionId is long optionId
                        ? [optionId]
                        : Array.Empty<long>();
                submittedText = attemptQuestion.SubmittedText;
            }
            else
            {
                selectedOptionIds = QuizAnswerSelection.ResolveSelectedOptionIds(submitted);
                submittedText = submitted.SubmittedText;
            }

            var questionMarks = attemptQuestion.Marks;
            var isCorrect = false;
            short awardedMarks = 0;
            var typeName = attemptQuestion.QuestionTypeName;
            var isMultiSelect = QuizQuestionHelper.IsMultiSelectType(typeName);
            var isFillBlank = QuizQuestionHelper.IsFillBlankType(typeName);
            var isMatching = QuizQuestionHelper.IsMatchingType(typeName);
            var isOrdering = QuizQuestionHelper.IsOrderingType(typeName);
            var isFileUpload = QuizQuestionHelper.IsFileUploadType(typeName);
            var isDescriptive = QuizQuestionHelper.IsDescriptiveType(typeName)
                || isFileUpload
                || (!isFillBlank
                    && !isMatching
                    && !isOrdering
                    && selectedOptionIds.Count == 0
                    && submittedText.HasTrimmedText());
            var acceptedAnswers = attemptQuestion.AcceptedAnswers
                ?? Array.Empty<QuestionAcceptedAnswerScoreItem>();

            // Matching/Ordering options are frozen in bank DisplayOrder (never shuffled).
            // Matching: first half = lefts, second half = rights; answer = right ids in left order.
            // Ordering: answer = option ids in correct sequence.
            if (isMatching && selectedOptionIds.Count > 0)
            {
                var orderedOptions = attemptQuestion.Options.ToArray();
                if (orderedOptions.Length >= 4 && orderedOptions.Length % 2 == 0)
                {
                    var half = orderedOptions.Length / 2;
                    var correctRights = orderedOptions.Skip(half).Select(option => option.OptionId).ToArray();
                    isCorrect = selectedOptionIds.Count == half
                        && selectedOptionIds.SequenceEqual(correctRights);
                }

                awardedMarks = isCorrect ? questionMarks : (short)0;
                obtainedMarks += awardedMarks;
            }
            else if (isOrdering && selectedOptionIds.Count > 0)
            {
                var correctOrder = attemptQuestion.Options.Select(option => option.OptionId).ToArray();
                isCorrect = selectedOptionIds.Count == correctOrder.Length
                    && selectedOptionIds.SequenceEqual(correctOrder);
                awardedMarks = isCorrect ? questionMarks : (short)0;
                obtainedMarks += awardedMarks;
            }
            else if (isMultiSelect && selectedOptionIds.Count > 0)
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
            else if (isFillBlank && submittedText.HasTrimmedText())
            {
                var fillText = submittedText.AsTrimmedString();
                isCorrect = acceptedAnswers.Any(answer => MatchesAcceptedAnswer(answer, fillText))
                    || attemptQuestion.Options.Any(option =>
                        option.IsCorrect
                        && string.Equals(
                            option.OptionText.AsTrimmedString(),
                            fillText,
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
                    submittedText,
                    awardedMarks,
                    isCorrect,
                    cancellationToken);

                if (allowAiReview && !rejectLateAnswer)
                {
                    await EnsureAiReviewAsync(
                        attemptId,
                        attemptQuestion.QuestionId,
                        bankQuestionText: attemptQuestion.QuestionText,
                        submittedText: submittedText ?? string.Empty,
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
                submittedText,
                awardedMarks,
                isCorrect,
                cancellationToken);

            // Descriptive always gets an AI suggestion when answered (teacher still finalizes).
            if (!rejectLateAnswer
                && !freezeAnswersForIntegrity
                && QuizQuestionHelper.IsDescriptiveType(typeName)
                && submittedText.HasTrimmedText())
            {
                await EnsureAiReviewAsync(
                    attemptId,
                    attemptQuestion.QuestionId,
                    bankQuestionText: attemptQuestion.QuestionText,
                    submittedText: submittedText ?? string.Empty,
                    isCorrect,
                    awardedMarks,
                    questionMarks,
                    Array.Empty<string>(),
                    cancellationToken);
            }
        }

        attempt.MarkSubmitted(
            submittedStatusId,
            obtainedMarks,
            totalMarks,
            (short)Math.Clamp((int)request.TimeSpentSeconds, 0, short.MaxValue));

        var reviewState = await _assignments.GetAssignmentReviewStateAsync(quizId, studentId, cancellationToken);
        // Progress assignment status from scoring-loop subjective detection (pre-persist).
        var statusVisibility = QuizReviewDisplay.Resolve(
            quiz.ReviewDisplayMode,
            reviewState?.IsReviewRequired ?? quiz.IsReviewRequired,
            reviewState?.IsReviewDone ?? false,
            hasSubjectiveAnswers);

        var assignment = await _assignments.GetAssignmentEntityAsync(quizId, studentId, cancellationToken);
        if (assignment is not null)
        {
            var resultStatusId = await _lookups.ResolveLookupIdAsync(
                LookupNames.QuizResultStatus,
                statusVisibility.ReviewPending ? "Under Review" : "Completed",
                fallback: statusVisibility.ReviewPending
                    ? LookupNames.QuizResultStatusIds.UnderReview
                    : LookupNames.QuizResultStatusIds.Completed,
                cancellationToken);
            assignment.SetResultStatus(resultStatusId);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var quizTitle = (await _quizzes.GetDetailForStudentAsync(quizId, studentId, cancellationToken))?.QuizTitle
            ?? "Quiz";

        if (assignment is not null && assignment.AssignedById != studentId)
        {
            var category = request.IsAutoSubmit
                ? QuizNotificationCategories.QuizAutoSubmitted
                : QuizNotificationCategories.QuizSubmitted;
            await _notifications.CreateAsync(
                [assignment.AssignedById],
                request.IsAutoSubmit ? "Quiz auto-submitted" : "Quiz submitted",
                $"A student submitted \"{quizTitle}\" (attempt #{attempt.AttemptNumber}).",
                category,
                cancellationToken);
        }

        var result = await _attempts.GetAttemptDetailAsync(attemptId, studentId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        // Same subjective detection as GetAttemptResultAsync — keeps submit/get-result mask symmetric.
        var visibility = QuizReviewDisplay.Resolve(
            quiz.ReviewDisplayMode,
            reviewState?.IsReviewRequired ?? quiz.IsReviewRequired,
            reviewState?.IsReviewDone ?? false,
            QuizQuestionHelper.HasSubjectiveAnswersRequiringReview(result.Questions));

        return QuizMapping.ToAttemptResult(
            result,
            quizTitle,
            visibility,
            resultStatusOverride: visibility.ReviewPending ? "Pending Review" : null);
    }

    public async Task<SyncOfflineQuizAttemptResponse> SyncOfflineAttemptAsync(
        long quizId,
        long attemptId,
        SyncOfflineQuizAttemptRequest request,
        CancellationToken cancellationToken)
    {
        EnsureStudentRole();
        var studentId = RequireStudentId();

        if (!request.ClientSyncId.HasTrimmedText())
        {
            throw new ValidationAppException(["Client sync id is required."]);
        }

        if (!request.DeviceId.HasTrimmedText())
        {
            throw new ValidationAppException(["Device id is required."]);
        }

        var syncId = request.ClientSyncId.Trim();
        var existingBySync = await _attempts.GetAttemptByClientSyncIdAsync(syncId, cancellationToken);
        if (existingBySync is not null)
        {
            if (existingBySync.Id != attemptId || existingBySync.QuizId != quizId || existingBySync.StudentId != studentId)
            {
                throw new BusinessRuleException("This sync id is already used by another attempt.");
            }

            if (await _attempts.IsSubmittedAttemptAsync(attemptId, cancellationToken))
            {
                var priorResult = await GetAttemptResultAsync(quizId, attemptId, cancellationToken);
                return new SyncOfflineQuizAttemptResponse(
                    attemptId,
                    AlreadySynced: true,
                    Submitted: true,
                    IsOfflineAttempt: true,
                    ClientSyncId: syncId,
                    Result: priorResult);
            }

            if (!request.Submit)
            {
                return new SyncOfflineQuizAttemptResponse(
                    attemptId,
                    AlreadySynced: true,
                    Submitted: false,
                    IsOfflineAttempt: true,
                    ClientSyncId: syncId,
                    Draft: new SaveQuizAttemptAnswersResponse(
                        attemptId,
                        0,
                        existingBySync.FocusLossCount,
                        existingBySync.ClipboardPasteCount,
                        true,
                        syncId));
            }
        }

        if (request.Submit)
        {
            var result = await SubmitAttemptAsync(
                quizId,
                attemptId,
                new SubmitQuizAttemptRequest(
                    request.Answers,
                    request.TimeSpentSeconds,
                    request.IsAutoSubmit,
                    request.DeviceId,
                    IsOfflineSync: true,
                    ClientSyncId: syncId),
                cancellationToken);

            return new SyncOfflineQuizAttemptResponse(
                attemptId,
                AlreadySynced: false,
                Submitted: true,
                IsOfflineAttempt: true,
                ClientSyncId: syncId,
                Result: result);
        }

        var draft = await SaveAttemptAnswersAsync(
            quizId,
            attemptId,
            new SaveQuizAttemptAnswersRequest(
                request.Answers,
                request.TimeSpentSeconds,
                request.FocusLossDelta,
                request.ClipboardPasteDelta,
                request.DeviceId,
                IsOfflineSync: true,
                ClientSyncId: syncId),
            cancellationToken);

        return new SyncOfflineQuizAttemptResponse(
            attemptId,
            AlreadySynced: false,
            Submitted: false,
            IsOfflineAttempt: true,
            ClientSyncId: syncId,
            Draft: draft);
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
        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken);
        var visibility = QuizReviewDisplay.Resolve(
            quiz?.ReviewDisplayMode,
            reviewState?.IsReviewRequired ?? quiz?.IsReviewRequired ?? false,
            reviewState?.IsReviewDone ?? false,
            hasSubjectiveAnswers);

        return QuizMapping.ToAttemptResult(
            result,
            quizTitle,
            visibility,
            resultStatusOverride: visibility.ReviewPending ? "Pending Review" : null);
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
            attempt.AttemptNumber,
            quizDetail?.TimeLimitMinutes ?? quiz.TimeLimitMinutes,
            attempt.StartedDate,
            resumed,
            questions,
            savedAnswers,
            string.IsNullOrWhiteSpace(quiz.NavigationMode) ? "Free" : quiz.NavigationMode,
            EnforceDeviceLock: true,
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

    public async Task<UploadQuizAttemptFileResponse> UploadAttemptAnswerFileAsync(
        long quizId,
        long attemptId,
        long attemptQuestionId,
        Stream fileContent,
        string fileName,
        string contentType,
        string deviceId,
        CancellationToken cancellationToken)
    {
        EnsureStudentRole();
        var studentId = RequireStudentId();
        ValidateDeviceId(deviceId);

        if (fileContent is null || !fileContent.CanRead)
        {
            throw new ValidationAppException(["A file is required."]);
        }

        if (fileContent.CanSeek && fileContent.Length > QuizAttemptFileUpload.MaxBytes)
        {
            throw new ValidationAppException(["File exceeds the 10 MB limit."]);
        }

        var fileNameTrimmed = fileName.AsTrimmedString();
        if (string.IsNullOrWhiteSpace(fileNameTrimmed))
        {
            throw new ValidationAppException(["File name is required."]);
        }

        var extension = Path.GetExtension(fileNameTrimmed).ToLowerInvariant();
        if (!QuizAttemptFileUpload.AllowedExtensions.Contains(extension))
        {
            throw new ValidationAppException(
                [$"File type is not allowed. Allowed: {string.Join(", ", QuizAttemptFileUpload.AllowedExtensions)}"]);
        }

        var access = await _assignments.GetAssignmentAccessAsync(quizId, studentId, cancellationToken)
            ?? throw new NotFoundAppException("This quiz is not assigned to you.");

        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("This quiz is not assigned to you.");

        var inProgressStatusId = await _lookups.ResolveLookupIdAsync(
            AttemptStatusType,
            InProgressStatusName,
            fallback: LookupNames.QuizAttemptStatusIds.InProgress,
            cancellationToken);

        var attempt = await _attempts.GetAttemptEntityByIdAsync(attemptId, quizId, cancellationToken)
            ?? throw new NotFoundAppException("Attempt was not found.");

        if (attempt.StudentId != studentId || attempt.StatusId != inProgressStatusId)
        {
            throw new BusinessRuleException("Only an in-progress attempt can accept file uploads.");
        }

        await EnsureAttemptWindowAsync(access, _dateTimeProvider.UtcNow, attempt, cancellationToken);
        await EnsureDeviceLockAsync(quiz, attempt, cancellationToken, deviceId);

        var attemptQuestion = await _attempts.GetAttemptQuestionByIdAsync(attemptQuestionId, cancellationToken)
            ?? throw new NotFoundAppException("Question was not found.");

        if (attemptQuestion.QuizAttemptId != attemptId)
        {
            throw new NotFoundAppException("Question was not found.");
        }

        if (!QuizQuestionHelper.IsFileUploadType(attemptQuestion.QuestionTypeName))
        {
            throw new BusinessRuleException("This question does not accept file uploads.");
        }

        var storageFolder = Path.Combine("uploads", "quiz-attempts", attemptId.ToString());
        var storedUrl = await _fileStorage.SaveAsync(
            fileContent,
            fileNameTrimmed,
            contentType,
            cancellationToken,
            storageFolder);

        return new UploadQuizAttemptFileResponse(storedUrl, Path.GetFileName(storedUrl));
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
        var parentUserId = _currentUser.UserId ?? throw new ForbiddenAppException("Parent account was not found.");
        var parentId = _currentUser.ProfileId ?? parentUserId;

        var catalogItems = await _quizzes.ListForSchoolAsync(
            schoolId: null,
            campusId: null,
            viewerUserId: parentUserId,
            includeAllDrafts: false,
            includeAllSchools: false,
            search,
            subject,
            grade,
            cancellationToken,
            includePublishedFromAllSchools: true);

        var studentIds = await _studentScope.GetLinkedStudentIdsAsync(parentId, cancellationToken);
        var assignedItems = studentIds.Count > 0
            ? await _quizzes.ListForLinkedStudentsAsync(studentIds, search, subject, grade, cancellationToken)
            : Array.Empty<QuizListItem>();

        return catalogItems
            .Concat(assignedItems.Where(assigned => catalogItems.All(item => item.QuizId != assigned.QuizId)))
            .OrderByDescending(item => item.StartDateTime ?? DateTimeOffset.MinValue)
            .ThenByDescending(item => item.QuizId)
            .ToArray();
    }

    private async Task<IReadOnlyList<QuizListItem>> ListForTutorAsync(
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken)
    {
        var tutorUserId = _currentUser.UserId ?? throw new ForbiddenAppException("Tutor account was not found.");
        var profileId = _currentUser.ProfileId ?? tutorUserId;

        var catalogItems = await _quizzes.ListForSchoolAsync(
            schoolId: null,
            campusId: null,
            viewerUserId: tutorUserId,
            includeAllDrafts: false,
            includeAllSchools: false,
            search,
            subject,
            grade,
            cancellationToken,
            includePublishedFromAllSchools: true);

        var studentIds = await _studentScope.GetTutorLinkedStudentIdsAsync(profileId, cancellationToken);
        var assignedItems = studentIds.Count > 0
            ? await _quizzes.ListForLinkedStudentsAsync(studentIds, search, subject, grade, cancellationToken)
            : Array.Empty<QuizListItem>();

        return catalogItems
            .Concat(assignedItems.Where(assigned => catalogItems.All(item => item.QuizId != assigned.QuizId)))
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

        // Published school-type quizzes (any school / creator) plus own drafts.
        return await _quizzes.ListForSchoolAsync(
            schoolId,
            campusId,
            viewerUserId: teacherUserId,
            includeAllDrafts: false,
            includeAllSchools: false,
            search,
            subject,
            grade,
            cancellationToken,
            includePublishedFromAllSchools: true);
    }

    private static readonly TimeSpan OfflineSubmitGrace = TimeSpan.FromMinutes(30);

    private async Task EnsureAttemptWindowAsync(
        QuizAssignmentAccess access,
        DateTimeOffset now,
        QuizAttempt? inProgressAttempt,
        CancellationToken cancellationToken,
        bool allowOfflineGrace = false)
    {
        if (now < access.StartDateTime)
        {
            throw new BusinessRuleException("This quiz is not open yet.");
        }

        if (now <= access.EndDateTime)
        {
            return;
        }

        // Offline reconnect: allow a short grace when the attempt started inside the window.
        if (allowOfflineGrace
            && inProgressAttempt is not null
            && inProgressAttempt.StartedDate <= access.EndDateTime
            && now <= access.EndDateTime + OfflineSubmitGrace)
        {
            return;
        }

        if (inProgressAttempt is not null
            && inProgressAttempt.StatusId == LookupNames.QuizAttemptStatusIds.InProgress)
        {
            inProgressAttempt.MarkExpired(LookupNames.QuizAttemptStatusIds.Expired);
            var assignment = await _assignments.GetAssignmentEntityAsync(
                inProgressAttempt.QuizId,
                inProgressAttempt.StudentId,
                cancellationToken);
            if (assignment is not null
                && assignment.QuizResultStatus is LookupNames.QuizResultStatusIds.InProgress
                    or LookupNames.QuizResultStatusIds.NotAttempted
                    or LookupNames.QuizResultStatusIds.Upcoming)
            {
                assignment.SetResultStatus(LookupNames.QuizResultStatusIds.Expired);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        throw new BusinessRuleException("The deadline for this quiz has passed.");
    }

    private static void ApplyOfflineSyncMarker(QuizAttempt attempt, string? clientSyncId)
    {
        if (!clientSyncId.HasTrimmedText())
        {
            throw new ValidationAppException(["Client sync id is required for offline sync."]);
        }

        attempt.MarkOfflineAttempt(clientSyncId!);
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

    /// <summary>
    /// True when the per-question budget is already exhausted on the server, or the client
    /// reports time beyond the frozen budget (no soft +5s grace for answer changes).
    /// </summary>
    private static bool IsPerQuestionTimeExceeded(
        short estimatedTimeSeconds,
        short? reportedSpentSeconds,
        short storedSpentSeconds)
    {
        if (estimatedTimeSeconds <= 0)
        {
            return false;
        }

        if (storedSpentSeconds >= estimatedTimeSeconds)
        {
            return true;
        }

        return reportedSpentSeconds is short spent && spent > estimatedTimeSeconds;
    }

    private async Task EnsureDeviceLockAsync(
        Quiz _,
        QuizAttempt attempt,
        CancellationToken cancellationToken,
        string? deviceId = null)
    {
        // Device lock applies to every quiz type (Competition included).
        if (!deviceId.HasTrimmedText())
        {
            throw new ValidationAppException(["Device id is required for this attempt."]);
        }

        attempt.EnsureSameDevice(deviceId!);
        await Task.CompletedTask;
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

        var attempt = await _attempts.GetAttemptEntityByIdAsync(attemptId, quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz attempt was not found.");

        if (role == UserRole.Parent)
        {
            var parentId = _currentUser.ProfileId ?? _currentUser.UserId
                ?? throw new ForbiddenAppException("Parent profile was not found.");

            if (!await _studentScope.IsLinkedStudentAsync(parentId, attempt.StudentId, cancellationToken))
            {
                throw new ForbiddenAppException("You can only view results for linked students.");
            }

            return attempt.StudentId;
        }

        if (role == UserRole.Tutor)
        {
            var tutorId = _currentUser.ProfileId ?? _currentUser.UserId
                ?? throw new ForbiddenAppException("Tutor profile was not found.");

            if (!await _studentScope.IsTutorLinkedStudentAsync(tutorId, attempt.StudentId, cancellationToken))
            {
                throw new ForbiddenAppException("You can only view results for linked students.");
            }

            var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
                ?? throw new NotFoundAppException("Quiz was not found.");
            if (!string.Equals(quiz.CreatedByName, tutorId.ToString(), StringComparison.Ordinal))
            {
                throw new ForbiddenAppException("You can only view results for quizzes you created.");
            }

            return attempt.StudentId;
        }

        throw new ForbiddenAppException("Only students, linked parents, and tutors can view quiz attempt results.");
    }

    private static bool HasAttemptAnswer(QuizAttemptQuestionItem question)
        => question.SelectedOptionIds.Count > 0
            || question.SelectedOptionId is not null
            || question.SubmittedText.HasTrimmedText();

    private static bool AnswerRequestHasContent(SubmitQuizAnswerRequest answer)
    {
        var optionIds = QuizAnswerSelection.ResolveSelectedOptionIds(answer);
        return optionIds.Count > 0 || answer.SubmittedText.HasTrimmedText();
    }

    private long RequireStudentId()
    {
        return _currentUser.ProfileId ?? _currentUser.UserId
            ?? throw new ForbiddenAppException("Student profile was not found.");
    }

    /// <summary>
    /// Public catalog materialization must stamp the quiz owner (creator), not the student,
    /// so submit notifications reach the teacher/parent/admin who owns the quiz.
    /// </summary>
    private static long ResolvePublicCatalogAssignedById(Quiz quiz, long studentId)
    {
        if (long.TryParse(quiz.CreatedByName, out var creatorId)
            && creatorId > 0
            && creatorId != studentId)
        {
            return creatorId;
        }

        if (long.TryParse(quiz.ApprovedBy, out var approverId)
            && approverId > 0
            && approverId != studentId)
        {
            return approverId;
        }

        return creatorId > 0 ? creatorId : studentId;
    }

    private async Task EnsureAiReviewAsync(
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
