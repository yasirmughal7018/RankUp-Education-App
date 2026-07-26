namespace RankUpEducation.Domain.Approvals;

/// <summary>
/// Workflow event recorded on an approval row. Null while a queue row is still pending.
/// Numeric values match lookups.id for type = ApprovalAction.
/// </summary>
public enum ApprovalAction : short
{
    /// <summary>Row was authored.</summary>
    Created = 2201,

    /// <summary>Owner sent the row into the review queue.</summary>
    SubmittedForReview = 2202,

    /// <summary>Generic approval (user registration).</summary>
    Approved = 2203,

    /// <summary>
    /// Question endorsed by CampusAdmin/SchoolAdmin — records review progress but
    /// leaves the question inactive and restricted.
    /// </summary>
    Endorsed = 2204,

    /// <summary>Question published by PortalAdmin — Public + Active + quiz-usable.</summary>
    Published = 2205,

    /// <summary>Approval refused, with a reason.</summary>
    Rejected = 2206,

    /// <summary>Published question switched on for quiz use.</summary>
    Activated = 2207,

    /// <summary>Published question switched off for quiz use (status unchanged).</summary>
    Deactivated = 2208,

    /// <summary>Row retired from the bank.</summary>
    Archived = 2209,

    /// <summary>Archived row restored to its prior workflow status.</summary>
    Unarchived = 2210,

    /// <summary>Question content or answers were edited.</summary>
    Modified = 2211,
}
