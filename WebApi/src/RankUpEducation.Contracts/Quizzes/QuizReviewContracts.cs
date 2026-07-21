namespace RankUpEducation.Contracts.Quizzes;

public sealed record PendingReviewListResponse(IReadOnlyList<PendingReviewItemResponse> Items);

/// <summary>Submitted attempt awaiting teacher/parent review.</summary>
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

/// <summary>Full review workspace for marking subjective answers.</summary>
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

/// <summary>One question on the review screen with marks and feedback.</summary>
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

/// <summary>Manual mark and optional feedback for one question during review.</summary>
public sealed record MarkAttemptAnswerRequest(
    long QuestionId,
    short AwardedMarks,
    string? Feedback);

public sealed record MarkAttemptAnswersRequest(
    IReadOnlyList<MarkAttemptAnswerRequest> Answers);

/// <summary>Final reviewed score released to the student.</summary>
public sealed record FinalizeReviewResponse(
    long AttemptId,
    long QuizId,
    short TotalMarks,
    short ObtainedMarks,
    short Percentage,
    bool IsReviewDone,
    string ResultStatus);
