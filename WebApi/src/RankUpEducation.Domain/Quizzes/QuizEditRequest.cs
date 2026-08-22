using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Quizzes;

/// <summary>
/// Request to edit a quiz after it is school-approved, portal-approved, or published.
/// Table: app_quiz_edit_request. Approvers decide via <c>app_approval</c>
/// (<c>entity_type = QuizEditRequest</c>). An unused approved row is a one-time edit grant;
/// using it returns the quiz to Draft + Pending so the owner must resubmit for approval.
/// </summary>
public sealed class QuizEditRequest
{
    public const int MaxReasonLength = 1000;

    private QuizEditRequest()
    {
        Reason = string.Empty;
    }

    private QuizEditRequest(
        long quizId,
        long requestedByUserId,
        UserRole requestedByRole,
        string reason,
        DateTimeOffset requestedAt)
    {
        QuizId = quizId;
        RequestedByUserId = requestedByUserId;
        RequestedByRole = requestedByRole;
        Reason = reason;
        Status = QuizEditRequestStatus.Pending;
        RequestedAt = requestedAt;
    }

    public long Id { get; private set; }
    public long QuizId { get; private set; }
    public long RequestedByUserId { get; private set; }
    public UserRole RequestedByRole { get; private set; }
    public string Reason { get; private set; }
    public QuizEditRequestStatus Status { get; private set; }
    public DateTimeOffset RequestedAt { get; private set; }
    public DateTimeOffset? ResolvedAt { get; private set; }
    public DateTimeOffset? EditUsedAt { get; private set; }
    public string? DecisionReason { get; private set; }

    public bool IsPending => Status == QuizEditRequestStatus.Pending;

    public bool HasUnusedEditGrant =>
        Status == QuizEditRequestStatus.Approved && EditUsedAt is null;

    public static QuizEditRequest Create(
        long quizId,
        long requestedByUserId,
        UserRole requestedByRole,
        string reason,
        DateTimeOffset requestedAt)
    {
        if (quizId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(quizId));
        }

        if (requestedByUserId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(requestedByUserId));
        }

        var trimmed = Normalize(reason)
            ?? throw new BusinessRuleException("A reason is required to request an edit.");

        return new QuizEditRequest(
            quizId,
            requestedByUserId,
            requestedByRole,
            trimmed,
            requestedAt);
    }

    public void Approve(DateTimeOffset resolvedAt)
    {
        if (!IsPending)
        {
            throw new BusinessRuleException("This edit request is no longer pending.");
        }

        Status = QuizEditRequestStatus.Approved;
        ResolvedAt = resolvedAt;
        DecisionReason = null;
    }

    public void Reject(DateTimeOffset resolvedAt, string? decisionReason)
    {
        if (!IsPending)
        {
            throw new BusinessRuleException("This edit request is no longer pending.");
        }

        Status = QuizEditRequestStatus.Rejected;
        ResolvedAt = resolvedAt;
        DecisionReason = Normalize(decisionReason);
    }

    public void Cancel(DateTimeOffset resolvedAt, string? decisionReason = null)
    {
        if (!IsPending)
        {
            return;
        }

        Status = QuizEditRequestStatus.Rejected;
        ResolvedAt = resolvedAt;
        DecisionReason = Normalize(decisionReason) ?? "This request is no longer applicable.";
    }

    public void MarkEditUsed(DateTimeOffset usedAt)
    {
        if (!HasUnusedEditGrant)
        {
            throw new BusinessRuleException("There is no unused edit grant for this request.");
        }

        EditUsedAt = usedAt;
    }

    private static string? Normalize(string? reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
        {
            return null;
        }

        var trimmed = reason.Trim();
        return trimmed.Length > MaxReasonLength
            ? trimmed[..MaxReasonLength]
            : trimmed;
    }
}
