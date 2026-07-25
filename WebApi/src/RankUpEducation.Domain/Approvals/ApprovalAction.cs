namespace RankUpEducation.Domain.Approvals;

/// <summary>
/// Workflow event recorded on an approval row. Null while a queue row is still pending.
/// </summary>
public enum ApprovalAction : short
{
    /// <summary>Row was authored.</summary>
    Created = 1,

    /// <summary>Owner sent the row into the review queue.</summary>
    SubmittedForReview = 2,

    /// <summary>Generic approval (user registration).</summary>
    Approved = 3,

    /// <summary>
    /// Question endorsed by CampusAdmin/SchoolAdmin — records review progress but
    /// leaves the question inactive and restricted.
    /// </summary>
    Endorsed = 4,

    /// <summary>Question published by PortalAdmin — Public + Active + quiz-usable.</summary>
    Published = 5,

    /// <summary>Approval refused, with a reason.</summary>
    Rejected = 6,

    /// <summary>Published question switched on for quiz use.</summary>
    Activated = 7,

    /// <summary>Published question switched off for quiz use (status unchanged).</summary>
    Deactivated = 8,

    /// <summary>Row retired from the bank.</summary>
    Archived = 9,

    /// <summary>Archived row restored to its prior workflow status.</summary>
    Unarchived = 10,
}
