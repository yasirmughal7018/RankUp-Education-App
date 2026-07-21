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
    IReadOnlyList<QuizOptionResponse> Options);

/// <summary>Device id required to bind an attempt to a client.</summary>
public sealed record StartQuizAttemptRequest(string DeviceId);

/// <summary>Attempt session with ordered questions and any saved draft answers.</summary>
public sealed record StartQuizAttemptResponse(
    long AttemptId,
    long QuizId,
    short AttemptNumber,
    short? TimeLimitMinutes,
    DateTimeOffset StartedAt,
    bool Resumed,
    IReadOnlyList<QuizQuestionForAttemptResponse> Questions,
    IReadOnlyList<SavedQuizAnswerResponse> SavedAnswers);

/// <summary>Previously saved draft answer restored on attempt resume.</summary>
public sealed record SavedQuizAnswerResponse(
    long QuestionId,
    long? SelectedOptionId,
    string? SubmittedText,
    IReadOnlyList<long>? SelectedOptionIds = null);

/// <summary>Autosave payload for an in-progress attempt.</summary>
public sealed record SaveQuizAttemptAnswersRequest(
    IReadOnlyList<SubmitQuizAnswerRequest> Answers,
    short? TimeSpentSeconds = null);

public sealed record SaveQuizAttemptAnswersResponse(
    long AttemptId,
    int SavedCount);

/// <summary>One answer on submit or draft save; supports multi-select via <see cref="SelectedOptionIds"/>.</summary>
public sealed record SubmitQuizAnswerRequest(
    long QuestionId,
    long? SelectedOptionId,
    string? SubmittedText,
    IReadOnlyList<long>? SelectedOptionIds = null);

/// <summary>Final submission with all answers and elapsed time.</summary>
public sealed record SubmitQuizAttemptRequest(
    IReadOnlyList<SubmitQuizAnswerRequest> Answers,
    short TimeSpentSeconds);

/// <summary>Scored attempt result; may mask marks while subjective review is pending.</summary>
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
    IReadOnlyList<QuizResultQuestionResponse> Questions);

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
