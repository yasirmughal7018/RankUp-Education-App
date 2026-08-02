using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Domain.Approvals;

/// <summary>
/// Generic approval queue + trail. Table: app_approval.
/// <para>
/// <see cref="EntityType"/> selects which typed foreign key carries the target row, so the
/// table keeps real referential integrity instead of an untyped entity id.
/// </para>
/// <para>
/// User rows behave as a <em>queue</em>: one row per eligible approver, pending until decided
/// (<see cref="IsApproved"/> null and <see cref="ApprovedAt"/> null). Question and Quiz rows
/// behave as an append-only <em>trail</em>: one row per workflow event, always already decided.
/// </para>
/// </summary>
public sealed class Approval
{
    public const int MaxReasonLength = 1000;

    private Approval()
    {
    }

    private Approval(
        ApprovalEntityType entityType,
        long? userId,
        long? questionId,
        long? quizId,
        long actorUserId,
        UserRole actorRole,
        ApprovalAction? action,
        string? reason,
        DateTimeOffset createdAt,
        DateTimeOffset? approvedAt,
        bool? isApproved)
    {
        EntityType = entityType;
        UserId = userId;
        QuestionId = questionId;
        QuizId = quizId;
        ApprovedByUserId = actorUserId;
        ApprovedByRole = actorRole;
        Action = action;
        Reason = Normalize(reason);
        CreatedAt = createdAt;
        ApprovedAt = approvedAt;
        IsApproved = isApproved;
    }

    public long Id { get; private set; }

    /// <summary>Which target column is populated.</summary>
    public ApprovalEntityType EntityType { get; private set; }

    /// <summary>Reviewed user, when <see cref="EntityType"/> is User.</summary>
    public long? UserId { get; private set; }

    /// <summary>Reviewed question, when <see cref="EntityType"/> is Question.</summary>
    public long? QuestionId { get; private set; }

    /// <summary>Reviewed quiz, when <see cref="EntityType"/> is Quiz.</summary>
    public long? QuizId { get; private set; }

    /// <summary>Assigned / acting admin for this row.</summary>
    public long ApprovedByUserId { get; private set; }

    public UserRole ApprovedByRole { get; private set; }

    /// <summary>Null while a queue row is pending; always set on trail rows.</summary>
    public ApprovalAction? Action { get; private set; }

    /// <summary>Rejection reason or free-text note.</summary>
    public string? Reason { get; private set; }

    /// <summary>Row insert time. Orders the trail even when <see cref="ApprovedAt"/> is null.</summary>
    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>Null while pending; set when this admin decides or when the event occurs.</summary>
    public DateTimeOffset? ApprovedAt { get; private set; }

    /// <summary>Null = pending / not a decision; true = approved; false = rejected.</summary>
    public bool? IsApproved { get; private set; }

    public bool IsPending => IsApproved is null && ApprovedAt is null;

    /// <summary>Queues a registration review row for one eligible approver.</summary>
    public static Approval CreatePending(
        long userId,
        long approverUserId,
        UserRole approverRole)
        => new(
            ApprovalEntityType.User,
            userId,
            questionId: null,
            quizId: null,
            approverUserId,
            approverRole,
            action: null,
            reason: null,
            createdAt: DateTimeOffset.UtcNow,
            approvedAt: null,
            isApproved: null);

    /// <summary>Appends one question-bank workflow event to the trail.</summary>
    public static Approval RecordQuestionEvent(
        long questionId,
        long actorUserId,
        UserRole actorRole,
        ApprovalAction action,
        DateTimeOffset occurredAt,
        string? reason = null)
    {
        if (questionId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(questionId), "Question id is required.");
        }

        if (actorUserId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(actorUserId), "Actor user id is required.");
        }

        return new Approval(
            ApprovalEntityType.Question,
            userId: null,
            questionId,
            quizId: null,
            actorUserId,
            actorRole,
            action,
            reason,
            createdAt: occurredAt,
            approvedAt: occurredAt,
            isApproved: DecisionFor(action));
    }

    /// <summary>Appends one quiz workflow event to the trail.</summary>
    public static Approval RecordQuizEvent(
        long quizId,
        long actorUserId,
        UserRole actorRole,
        ApprovalAction action,
        DateTimeOffset occurredAt,
        string? reason = null)
    {
        if (quizId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(quizId), "Quiz id is required.");
        }

        if (actorUserId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(actorUserId), "Actor user id is required.");
        }

        return new Approval(
            ApprovalEntityType.Quiz,
            userId: null,
            questionId: null,
            quizId,
            actorUserId,
            actorRole,
            action,
            reason,
            createdAt: occurredAt,
            approvedAt: occurredAt,
            isApproved: DecisionFor(action));
    }

    public void MarkApproved(DateTimeOffset approvedAt)
    {
        if (!IsPending)
        {
            return;
        }

        IsApproved = true;
        Action = ApprovalAction.Approved;
        ApprovedAt = approvedAt;
    }

    public void MarkRejected(DateTimeOffset rejectedAt)
    {
        if (!IsPending)
        {
            return;
        }

        RecordRejected(rejectedAt);
    }

    /// <summary>
    /// Force-record rejection (e.g. admin who previously approved then rejects while still pending activation).
    /// </summary>
    public void RecordRejected(DateTimeOffset rejectedAt)
    {
        IsApproved = false;
        Action = ApprovalAction.Rejected;
        ApprovedAt = rejectedAt;
    }

    /// <summary>Approve-style events read as true, refusals as false, neutral lifecycle events as null.</summary>
    private static bool? DecisionFor(ApprovalAction action) => action switch
    {
        ApprovalAction.Approved or ApprovalAction.Endorsed or ApprovalAction.Published => true,
        ApprovalAction.Rejected => false,
        _ => null
    };

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
