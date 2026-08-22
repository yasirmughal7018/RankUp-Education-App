namespace RankUpEducation.Contracts.Quizzes;

public sealed record CreateQuizEditRequestRequest(string Reason);

public sealed record RejectQuizEditRequestRequest(string Reason);

public sealed record QuizEditRequestSummary(
    long RequestId,
    long QuizId,
    string RequesterName,
    string RequesterRole,
    string Reason,
    string Status,
    DateTimeOffset RequestedAt,
    DateTimeOffset? ResolvedAt,
    bool HasUnusedEditGrant,
    string? DecisionReason = null);

public sealed record QuizEditRequestListItem(
    long RequestId,
    long QuizId,
    string QuizTitle,
    string RequesterName,
    string RequesterRole,
    string Reason,
    DateTimeOffset RequestedAt);

public sealed record QuizEditRequestListResponse(
    IReadOnlyList<QuizEditRequestListItem> Items);
