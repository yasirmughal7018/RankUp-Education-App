using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Questions;

/// <summary>
/// Request to edit an Active (published) question. Table: app_question_edit_request.
/// PortalAdmin decides via <c>app_approval</c> (<c>entity_type = QuestionEditRequest</c>).
/// An unused approved row is a one-time edit grant; using it returns the question to PendingReview.
/// </summary>
public sealed class QuestionEditRequest
{
    public const int MaxReasonLength = 1000;

    private QuestionEditRequest()
    {
        Reason = string.Empty;
    }

    private QuestionEditRequest(
        long questionId,
        long requestedByUserId,
        UserRole requestedByRole,
        string reason,
        DateTimeOffset requestedAt)
    {
        QuestionId = questionId;
        RequestedByUserId = requestedByUserId;
        RequestedByRole = requestedByRole;
        Reason = reason;
        Status = QuestionEditRequestStatus.Pending;
        RequestedAt = requestedAt;
    }

    public long Id { get; private set; }
    public long QuestionId { get; private set; }
    public long RequestedByUserId { get; private set; }
    public UserRole RequestedByRole { get; private set; }
    /// <summary>Why the requester wants to change this Active question.</summary>
    public string Reason { get; private set; }
    public QuestionEditRequestStatus Status { get; private set; }
    public DateTimeOffset RequestedAt { get; private set; }
    public DateTimeOffset? ResolvedAt { get; private set; }
    /// <summary>Set when the requester consumes the one-time edit grant.</summary>
    public DateTimeOffset? EditUsedAt { get; private set; }
    /// <summary>PortalAdmin reject reason, when rejected.</summary>
    public string? DecisionReason { get; private set; }

    public bool IsPending => Status == QuestionEditRequestStatus.Pending;

    public bool HasUnusedEditGrant =>
        Status == QuestionEditRequestStatus.Approved && EditUsedAt is null;

    public static QuestionEditRequest Create(
        long questionId,
        long requestedByUserId,
        UserRole requestedByRole,
        string reason,
        DateTimeOffset requestedAt)
    {
        if (questionId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(questionId));
        }

        if (requestedByUserId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(requestedByUserId));
        }

        var trimmed = Normalize(reason)
            ?? throw new BusinessRuleException("A reason is required to request an edit.");

        return new QuestionEditRequest(
            questionId,
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

        Status = QuestionEditRequestStatus.Approved;
        ResolvedAt = resolvedAt;
        DecisionReason = null;
    }

    public void Reject(DateTimeOffset resolvedAt, string? decisionReason)
    {
        if (!IsPending)
        {
            throw new BusinessRuleException("This edit request is no longer pending.");
        }

        Status = QuestionEditRequestStatus.Rejected;
        ResolvedAt = resolvedAt;
        DecisionReason = Normalize(decisionReason);
    }

    /// <summary>Closes a superseded pending request (question left Active, or another grant was used).</summary>
    public void Cancel(DateTimeOffset resolvedAt, string? decisionReason = null)
    {
        if (!IsPending)
        {
            return;
        }

        Status = QuestionEditRequestStatus.Rejected;
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
