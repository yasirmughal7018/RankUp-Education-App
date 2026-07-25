namespace RankUpEducation.Domain.Approvals;

/// <summary>
/// Target kind for a row in app_approval. Selects which typed foreign key is populated
/// (<see cref="Approval.UserId"/> or <see cref="Approval.QuestionId"/>).
/// Add a new member together with its own nullable FK column.
/// </summary>
public enum ApprovalEntityType : short
{
    /// <summary>Registration review of an app_users row.</summary>
    User = 1,

    /// <summary>Question-bank workflow trail for a questions row.</summary>
    Question = 2,
}
