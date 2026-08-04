namespace RankUpEducation.Contracts.Quizzes;

/// <summary>Option presented during an attempt (correctness hidden from students).</summary>
public sealed record QuizOptionResponse(
    long Id,
    string Text,
    string? ImageUrl);

/// <summary>Question payload when starting or resuming an attempt.</summary>
public sealed record QuizQuestionForAttemptResponse(
    long Id,
    string Text,
    string QuestionType,
    short Marks,
    short DisplayOrder,
    string? Hint,
    IReadOnlyList<QuizOptionResponse> Options,
    short EstimatedTimeSeconds = 0,
    short TimeSpentSeconds = 0);

/// <summary>Device id required to bind an attempt to a client.</summary>
public sealed record StartQuizAttemptRequest(
    string DeviceId,
    bool InstructionsAcknowledged = false);

/// <summary>Attempt session with ordered questions and any saved draft answers.</summary>
public sealed record StartQuizAttemptResponse(
    long AttemptId,
    long QuizId,
    short AttemptNumber,
    short? TimeLimitMinutes,
    DateTimeOffset StartedAt,
    bool Resumed,
    IReadOnlyList<QuizQuestionForAttemptResponse> Questions,
    IReadOnlyList<SavedQuizAnswerResponse> SavedAnswers,
    string NavigationMode = "Free",
    bool EnforceDeviceLock = false,
    short FocusLossCount = 0,
    short ClipboardPasteCount = 0,
    bool EnablePerQuestionTimer = false);

/// <summary>Previously saved draft answer restored on attempt resume.</summary>
public sealed record SavedQuizAnswerResponse(
    long QuestionId,
    long? SelectedOptionId,
    string? SubmittedText,
    IReadOnlyList<long>? SelectedOptionIds = null,
    bool IsMarkedForReview = false);

/// <summary>Autosave payload for an in-progress attempt.</summary>
public sealed record SaveQuizAttemptAnswersRequest(
    IReadOnlyList<SubmitQuizAnswerRequest> Answers,
    short? TimeSpentSeconds = null,
    short? FocusLossDelta = null,
    short? ClipboardPasteDelta = null,
    string? DeviceId = null,
    bool IsOfflineSync = false,
    string? ClientSyncId = null);

public sealed record SaveQuizAttemptAnswersResponse(
    long AttemptId,
    int SavedCount,
    short FocusLossCount = 0,
    short ClipboardPasteCount = 0,
    bool IsOfflineAttempt = false,
    string? ClientSyncId = null);

/// <summary>One answer on submit or draft save; supports multi-select via <see cref="SelectedOptionIds"/>.</summary>
public sealed record SubmitQuizAnswerRequest(
    long QuestionId,
    long? SelectedOptionId,
    string? SubmittedText,
    IReadOnlyList<long>? SelectedOptionIds = null,
    bool? IsMarkedForReview = null,
    short? TimeSpentSeconds = null);

/// <summary>Final submission with all answers and elapsed time.</summary>
public sealed record SubmitQuizAttemptRequest(
    IReadOnlyList<SubmitQuizAnswerRequest> Answers,
    short TimeSpentSeconds,
    bool IsAutoSubmit = false,
    string? DeviceId = null,
    bool IsOfflineSync = false,
    string? ClientSyncId = null);

/// <summary>
/// Replays a queued offline draft or final submit after reconnect.
/// <see cref="ClientSyncId"/> is idempotent — retries return the prior outcome.
/// </summary>
public sealed record SyncOfflineQuizAttemptRequest(
    string ClientSyncId,
    IReadOnlyList<SubmitQuizAnswerRequest> Answers,
    short TimeSpentSeconds,
    string DeviceId,
    bool Submit = false,
    bool IsAutoSubmit = false,
    short? FocusLossDelta = null,
    short? ClipboardPasteDelta = null);

public sealed record SyncOfflineQuizAttemptResponse(
    long AttemptId,
    bool AlreadySynced,
    bool Submitted,
    bool IsOfflineAttempt,
    string ClientSyncId,
    SaveQuizAttemptAnswersResponse? Draft = null,
    QuizAttemptResultResponse? Result = null);

/// <summary>Scored attempt result; may mask marks while subjective review is pending or review is withheld.</summary>
public sealed record QuizAttemptResultResponse(
    long AttemptId,
    long QuizId,
    string QuizTitle,
    short AttemptNumber,
    short TotalMarks,
    short ObtainedMarks,
    short Percentage,
    short TimeSpentSeconds,
    string ResultStatus,
    bool ReviewAvailable,
    IReadOnlyList<QuizResultQuestionResponse> Questions,
    bool ReviewPending = false,
    string ReviewDisplayMode = "ScoreOnly");

/// <summary>Per-question breakdown on result view (includes correct answers when review allows).</summary>
public sealed record QuizResultQuestionResponse(
    long Id,
    string Text,
    short Marks,
    short AwardedMarks,
    bool IsCorrect,
    string? Explanation,
    long? SelectedOptionId,
    long? CorrectOptionId,
    string? SubmittedText,
    IReadOnlyList<long>? SelectedOptionIds = null,
    IReadOnlyList<long>? CorrectOptionIds = null);
