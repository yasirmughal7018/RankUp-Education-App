using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Approvals;
using RankUpEducation.Domain.Auth;



namespace RankUpEducation.Application.Questions;



/// <summary>Projection row for question-bank list endpoints (includes org + visibility).</summary>

public sealed record QuestionListItem(

    long QuestionId,

    string QuestionText,

    string QuestionTypeName,

    string StatusName,

    short ClassId,

    short SubjectId,

    short DifficultyLevel,

    short Marks,

    short EstimatedTimeSeconds,

    bool IsActive,

    /// <summary>Creator user id as string (ownership checks).</summary>
    string CreatedBy,

    /// <summary>Creator display name from app_users.</summary>
    string CreatedByName,

    /// <summary>Role the creator acted as (approval hierarchy / restricted visibility).</summary>
    UserRole CreatedByRole,

    /// <summary>Approver user id as string, or null.</summary>
    string? ApprovedBy,

    /// <summary>Approver display name from app_users, or null.</summary>
    string? ApprovedByName,

    bool IsAiApproved,

    int? SchoolId,

    int? CampusId,

    short VisibilityLevel,

    string Visibility,

    DateOnly CreatedDate,

    DateOnly ModifiedDate,

    /// <summary>Comma-separated correct options / accepted answers for bank pickers.</summary>
    string CorrectAnswerPreview);



/// <summary>Full question projection for detail / create / update responses.</summary>

public sealed record QuestionDetailItem(

    long QuestionId,

    string QuestionText,

    short QuestionTypeId,

    string QuestionTypeName,

    short ClassId,

    short SubjectId,

    short? TopicId,

    short DifficultyLevel,

    short StatusId,

    string StatusName,

    short Marks,

    short EstimatedTimeSeconds,

    string? Hint,

    string? Explanation,

    bool IsActive,

    /// <summary>Creator user id as string (ownership checks).</summary>
    string CreatedBy,

    /// <summary>Creator display name from app_users.</summary>
    string CreatedByName,

    /// <summary>Role the creator acted as (approval hierarchy / restricted visibility).</summary>
    UserRole CreatedByRole,

    /// <summary>Approver user id as string, or null.</summary>
    string? ApprovedBy,

    /// <summary>Approver display name from app_users, or null.</summary>
    string? ApprovedByName,

    bool IsAiApproved,

    string? RejectionReason,

    int? SchoolId,

    int? CampusId,

    short VisibilityLevel,

    string Visibility,

    DateOnly CreatedDate,

    DateOnly ModifiedDate,

    IReadOnlyList<QuizQuestionOptionItem> Options,

    IReadOnlyList<QuestionAcceptedAnswerItem> AcceptedAnswers,

    /// <summary>Workflow trail from app_approval, oldest first.</summary>
    IReadOnlyList<QuestionApprovalEventItem> ApprovalHistory);



/// <summary>One question-bank workflow event projected from app_approval.</summary>

public sealed record QuestionApprovalEventItem(

    long ApprovalId,

    /// <summary>Created | SubmittedForReview | Endorsed | Published | Rejected | Activated | Deactivated | Archived | Unarchived | Modified.</summary>
    ApprovalAction Action,

    long ActorUserId,

    string ActorName,

    UserRole ActorRole,

    string? Reason,

    DateTimeOffset OccurredAt);



/// <summary>Fill-in-the-Blank accepted-answer projection.</summary>

public sealed record QuestionAcceptedAnswerItem(

    long AcceptedAnswerId,

    string AnswerText,

    bool IsCaseSensitive,

    bool AllowPartialMatch,

    string NormalizedAnswer,

    short MinimumLength,

    short MaximumLength,

    bool AllowAiReview,

    bool AllowTeacherReview);



/// <summary>

/// Org-aware bank visibility for non–PortalAdmin list queries.

/// Null filter means no visibility restriction (PortalAdmin).

/// Own + Public always included; non-Public rows only for upward admins matching creator tier.

/// </summary>

public sealed record QuestionListVisibilityScope(

    long UserId,

    int? SchoolId,

    int? CampusId,

    UserRole Role);

