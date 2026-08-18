namespace RankUpEducation.Contracts.Questions;

public sealed record CreateQuestionEditRequestRequest(string Reason);

public sealed record RejectQuestionEditRequestRequest(string Reason);

public sealed record QuestionEditRequestSummary(
    long RequestId,
    long QuestionId,
    string RequesterName,
    string RequesterRole,
    string Reason,
    string Status,
    DateTimeOffset RequestedAt,
    DateTimeOffset? ResolvedAt,
    bool HasUnusedEditGrant,
    string? DecisionReason = null);

public sealed record QuestionEditRequestListItem(
    long RequestId,
    long QuestionId,
    string QuestionText,
    string RequesterName,
    string RequesterRole,
    string Reason,
    DateTimeOffset RequestedAt);

public sealed record QuestionEditRequestListResponse(
    IReadOnlyList<QuestionEditRequestListItem> Items);

public sealed record QuestionQuizUsageItem(
    long QuizId,
    string Title,
    string LifecycleStatus,
    string ApprovalStatus,
    short Marks,
    short DisplayOrder,
    string CreatedBy);

public sealed record QuestionQuizUsageListResponse(
    IReadOnlyList<QuestionQuizUsageItem> Items);
