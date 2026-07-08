namespace RankUpEducation.Contracts.Quizzes;

public sealed record PendingReviewListResponse(IReadOnlyList<PendingReviewItemResponse> Items);

public sealed record PendingReviewItemResponse(
    long QuizId,
    string QuizTitle,
    long AttemptId,
    long StudentId,
    string StudentName,
    short AttemptNumber,
    DateTimeOffset SubmittedAt,
    short TotalMarks,
    short ObtainedMarks);

public sealed record AttemptReviewResponse(
    long AttemptId,
    long QuizId,
    string QuizTitle,
    long StudentId,
    string StudentName,
    short AttemptNumber,
    short TotalMarks,
    short ObtainedMarks,
    short Percentage,
    string Status,
    bool IsReviewDone,
    DateTimeOffset SubmittedAt,
    IReadOnlyList<AttemptReviewQuestionResponse> Questions);

public sealed record AttemptReviewQuestionResponse(
    long QuestionId,
    string QuestionText,
    string QuestionType,
    short MaxMarks,
    short AwardedMarks,
    bool IsCorrect,
    long? SelectedOptionId,
    string? SubmittedText,
    string? ParentFeedback,
    bool RequiresReview,
    IReadOnlyList<long>? SelectedOptionIds = null);

public sealed record MarkAttemptAnswerRequest(
    long QuestionId,
    short AwardedMarks,
    string? Feedback);

public sealed record MarkAttemptAnswersRequest(
    IReadOnlyList<MarkAttemptAnswerRequest> Answers);

public sealed record FinalizeReviewResponse(
    long AttemptId,
    long QuizId,
    short TotalMarks,
    short ObtainedMarks,
    short Percentage,
    bool IsReviewDone,
    string ResultStatus);
