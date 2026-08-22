namespace RankUpEducation.Domain.Approvals;

/// <summary>
/// Target kind for a row in app_approval.
/// Registration uses <see cref="Approval.UserId"/>; Question, Quiz, SchoolChangeRequest,
/// QuestionEditRequest, and QuizEditRequest use <see cref="Approval.RequestId"/>.
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

    /// <summary>
    /// Request to edit an Active question (<see cref="Approval.RequestId"/> = edit-request id).
    /// Queue style: one pending row per PortalAdmin.
    /// </summary>
    QuestionEditRequest = 2105,

    /// <summary>
    /// Request to edit an approved or published quiz (<see cref="Approval.RequestId"/> = edit-request id).
    /// Queue style: one pending row per eligible approver.
    /// </summary>
    QuizEditRequest = 2106,
}
