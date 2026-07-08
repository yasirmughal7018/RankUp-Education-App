namespace RankUpEducation.Contracts.Quizzes;

public sealed record QuizOptionResponse(
    long Id,
    string Text,
    string? ImageUrl);

public sealed record QuizQuestionForAttemptResponse(
    long Id,
    string Text,
    string QuestionType,
    short Marks,
    short DisplayOrder,
    string? Hint,
    IReadOnlyList<QuizOptionResponse> Options);

public sealed record StartQuizAttemptRequest(string DeviceId);

public sealed record StartQuizAttemptResponse(
    long AttemptId,
    long QuizId,
    short AttemptNumber,
    short? TimeLimitMinutes,
    DateTimeOffset StartedAt,
    bool Resumed,
    IReadOnlyList<QuizQuestionForAttemptResponse> Questions,
    IReadOnlyList<SavedQuizAnswerResponse> SavedAnswers);

public sealed record SavedQuizAnswerResponse(
    long QuestionId,
    long? SelectedOptionId,
    string? SubmittedText,
    IReadOnlyList<long>? SelectedOptionIds = null);

public sealed record SaveQuizAttemptAnswersRequest(
    IReadOnlyList<SubmitQuizAnswerRequest> Answers,
    short? TimeSpentSeconds = null);

public sealed record SaveQuizAttemptAnswersResponse(
    long AttemptId,
    int SavedCount);

public sealed record SubmitQuizAnswerRequest(
    long QuestionId,
    long? SelectedOptionId,
    string? SubmittedText,
    IReadOnlyList<long>? SelectedOptionIds = null);

public sealed record SubmitQuizAttemptRequest(
    IReadOnlyList<SubmitQuizAnswerRequest> Answers,
    short TimeSpentSeconds);

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
