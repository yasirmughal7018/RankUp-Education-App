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
    IReadOnlyList<QuizQuestionForAttemptResponse> Questions);

public sealed record SubmitQuizAnswerRequest(
    long QuestionId,
    long? SelectedOptionId,
    string? SubmittedText);

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
    string? SubmittedText);
