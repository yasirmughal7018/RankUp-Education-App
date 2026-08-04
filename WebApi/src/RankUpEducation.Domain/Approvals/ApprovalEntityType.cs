namespace RankUpEducation.Domain.Approvals;

/// <summary>
/// Target kind for a row in app_approval.
/// Registration uses <see cref="Approval.UserId"/>; Question, Quiz, and SchoolChangeRequest
/// use <see cref="Approval.RequestId"/> (question id, quiz id, or school-change request id).
/// Numeric values match lookups.id for type = ApprovalEntityType.
/// </summary>
public enum ApprovalEntityType : short
{
    /// <summary>Registration review of an app_users row (<see cref="Approval.UserId"/>).</summary>
    User = 2101,

    /// <summary>Question-bank workflow trail (<see cref="Approval.RequestId"/> = question id).</summary>
    Question = 2102,

    /// <summary>Quiz workflow trail (<see cref="Approval.RequestId"/> = quiz id).</summary>
    Quiz = 2103,

    /// <summary>
    /// School/campus change review (<see cref="Approval.RequestId"/> = school-change request id).
    /// </summary>
    SchoolChangeRequest = 2104,
}
