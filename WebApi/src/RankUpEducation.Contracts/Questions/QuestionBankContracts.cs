namespace RankUpEducation.Contracts.Questions;



public sealed record QuestionOptionRequest(
    string OptionText,
    bool IsCorrect,
    string? OptionImageUrl = null);

public sealed record QuestionOptionResponse(
    long OptionId,
    string OptionText,
    bool IsCorrect,
    string? OptionImageUrl = null);



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



/// <summary>

/// Create payload. Always enters PendingReview (PortalAdmin: auto-published).
/// Use POST /questions/{id}/submit to move Rejected back to PendingReview.

/// </summary>

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

    IReadOnlyList<QuestionAcceptedAnswerRequest>? AcceptedAnswers = null);



/// <summary>Update content/answers only; status transitions require POST submit / approve / reject.</summary>

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



/// <summary>Bank list row including org ids and visibility display name.</summary>

public sealed record QuestionSummaryResponse(

    long QuestionId,

    string QuestionText,

    string QuestionType,

    string Status,

    short ClassId,

    short SubjectId,

    short DifficultyLevel,

    short Marks,

    short EstimatedTimeSeconds,

    bool IsActive,

    /// <summary>Creator user id (ownership checks).</summary>
    string CreatedBy,

    /// <summary>Creator display name.</summary>
    string CreatedByName,

    /// <summary>Approver user id, or null.</summary>
    string? ApprovedBy,

    /// <summary>Approver display name, or null.</summary>
    string? ApprovedByName,

    /// <summary>Legacy compatibility flag (not an AI gate). Prefer ApprovedBy + Approved status + Visibility for quiz eligibility.</summary>

    bool IsAiApproved,

    /// <summary>Owning school stamped at create (nullable for PortalAdmin-created).</summary>

    int? SchoolId,

    /// <summary>Owning campus stamped at create (nullable for school/portal scope).</summary>

    int? CampusId,

    /// <summary>None | Campus | School | Public — set by who approved (CampusAdmin/SchoolAdmin/PortalAdmin).</summary>

    string Visibility,

    DateOnly CreatedDate,

    DateOnly ModifiedDate,

    /// <summary>Comma-separated correct options / accepted answers for quiz bank pickers.</summary>
    string CorrectAnswerPreview = "");



public sealed record QuestionListResponse(IReadOnlyList<QuestionSummaryResponse> Items);



/// <summary>Full question detail including options/answers, org, and visibility.</summary>

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

    /// <summary>Creator user id (ownership checks).</summary>
    string CreatedBy,

    /// <summary>Creator display name.</summary>
    string CreatedByName,

    /// <summary>Approver user id, or null.</summary>
    string? ApprovedBy,

    /// <summary>Approver display name, or null.</summary>
    string? ApprovedByName,

    /// <summary>Legacy compatibility flag (not an AI gate). Prefer ApprovedBy + Approved status + Visibility for quiz eligibility.</summary>

    bool IsAiApproved,

    string? RejectionReason,

    /// <summary>Owning school stamped at create (nullable for PortalAdmin-created).</summary>

    int? SchoolId,

    /// <summary>Owning campus stamped at create (nullable for school/portal scope).</summary>

    int? CampusId,

    /// <summary>None | Campus | School | Public — set by who approved (CampusAdmin/SchoolAdmin/PortalAdmin).</summary>

    string Visibility,

    DateOnly CreatedDate,

    DateOnly ModifiedDate,

    IReadOnlyList<QuestionOptionResponse> Options,

    IReadOnlyList<QuestionAcceptedAnswerResponse> AcceptedAnswers,

    /// <summary>Workflow trail from app_approval, oldest first.</summary>

    IReadOnlyList<QuestionApprovalHistoryItem> ApprovalHistory);



/// <summary>One entry in a question's approval trail.</summary>

public sealed record QuestionApprovalHistoryItem(

    long ApprovalId,

    /// <summary>Created | SubmittedForReview | Endorsed | Published | Rejected | Activated | Deactivated | Archived | Unarchived | Modified.</summary>

    string Action,

    long ActorUserId,

    string ActorName,

    /// <summary>PortalAdmin | SchoolAdmin | CampusAdmin | Teacher | Parent | Student.</summary>

    string ActorRole,

    /// <summary>Rejection reason, or null.</summary>

    string? Reason,

    DateTimeOffset OccurredAt);



/// <summary>Result of Approve or Reject (includes resulting Visibility).</summary>

public sealed record QuestionApprovalResponse(

    long QuestionId,

    string Status,

    bool IsActive,

    string? ApprovedBy,

    /// <summary>Approver display name, or null.</summary>
    string? ApprovedByName,

    /// <summary>Legacy compatibility flag (not an AI gate). Prefer ApprovedBy + Approved status + Visibility for quiz eligibility.</summary>

    bool IsAiApproved,

    /// <summary>None | Campus | School | Public after Approve; None after Reject.</summary>

    string Visibility,

    string? RejectionReason = null);



/// <summary>PortalAdmin activate / deactivate / archive result.</summary>

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

