namespace RankUpEducation.Contracts.Questions;

public sealed record QuestionOptionRequest(
    string OptionText,
    bool IsCorrect);

public sealed record QuestionOptionResponse(
    long OptionId,
    string OptionText,
    bool IsCorrect);

public sealed record QuestionAcceptedAnswerRequest(
    string AnswerText,
    bool IsCaseSensitive = false,
    bool AllowPartialMatch = false,
    short MinimumLength = 0,
    short MaximumLength = 1000,
    bool AllowAiReview = false,
    bool AllowTeacherReview = false);

public sealed record QuestionAcceptedAnswerResponse(
    long AcceptedAnswerId,
    string AnswerText,
    bool IsCaseSensitive,
    bool AllowPartialMatch,
    short MinimumLength,
    short MaximumLength,
    bool AllowAiReview,
    bool AllowTeacherReview);

public sealed record CreateQuestionRequest(
    string QuestionText,
    string QuestionType,
    short ClassId,
    short SubjectId,
    short? TopicId,
    short DifficultyLevel,
    short Marks,
    short EstimatedTimeSeconds,
    string? Hint,
    string? Explanation,
    IReadOnlyList<QuestionOptionRequest> Options,
    IReadOnlyList<QuestionAcceptedAnswerRequest>? AcceptedAnswers = null,
    /// <summary>Ignored for create — always PendingReview. Kept for API compatibility.</summary>
    bool SubmitForReview = true);

public sealed record UpdateQuestionRequest(
    string QuestionText,
    string QuestionType,
    short ClassId,
    short SubjectId,
    short? TopicId,
    short DifficultyLevel,
    short Marks,
    short EstimatedTimeSeconds,
    string? Hint,
    string? Explanation,
    IReadOnlyList<QuestionOptionRequest> Options,
    IReadOnlyList<QuestionAcceptedAnswerRequest>? AcceptedAnswers = null);

public sealed record QuestionSummaryResponse(
    long QuestionId,
    string QuestionText,
    string QuestionType,
    string Status,
    short ClassId,
    short SubjectId,
    short DifficultyLevel,
    short Marks,
    bool IsActive,
    string CreatedBy,
    string? ApprovedBy,
    /// <summary>Legacy field kept for API compatibility. Prefer ApprovedBy + Approved status for quiz eligibility.</summary>
    bool IsAiApproved,
    DateOnly CreatedDate,
    DateOnly ModifiedDate);

public sealed record QuestionListResponse(IReadOnlyList<QuestionSummaryResponse> Items);

public sealed record QuestionDetailResponse(
    long QuestionId,
    string QuestionText,
    string QuestionType,
    short ClassId,
    short SubjectId,
    short? TopicId,
    short DifficultyLevel,
    string Status,
    short Marks,
    short EstimatedTimeSeconds,
    string? Hint,
    string? Explanation,
    bool IsActive,
    string CreatedBy,
    string? ApprovedBy,
    /// <summary>Legacy field kept for API compatibility. Prefer ApprovedBy + Approved status for quiz eligibility.</summary>
    bool IsAiApproved,
    string? RejectionReason,
    DateOnly CreatedDate,
    DateOnly ModifiedDate,
    IReadOnlyList<QuestionOptionResponse> Options,
    IReadOnlyList<QuestionAcceptedAnswerResponse> AcceptedAnswers);

public sealed record QuestionApprovalResponse(
    long QuestionId,
    string Status,
    bool IsActive,
    string? ApprovedBy,
    /// <summary>Legacy field kept for API compatibility. Prefer ApprovedBy + Approved status for quiz eligibility.</summary>
    bool IsAiApproved,
    string? RejectionReason = null);

public sealed record QuestionActiveStateResponse(
    long QuestionId,
    bool IsActive,
    string Status);

public sealed record DeleteQuestionResponse(
    long QuestionId,
    bool Deleted,
    bool Deactivated);

/// <summary>Rejection reason is required (min length enforced in service).</summary>
public sealed record RejectQuestionRequest(string Reason);

public sealed record ImportQuestionRowError(int RowNumber, string Message);

public sealed record ImportQuestionsResponse(
    bool DryRun,
    int CreatedCount,
    int ErrorCount,
    IReadOnlyList<QuestionDetailResponse> Created,
    IReadOnlyList<ImportQuestionRowError> Errors);
