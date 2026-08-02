namespace RankUpEducation.Domain.Approvals;

/// <summary>
/// Target kind for a row in app_approval. Selects which typed foreign key is populated
/// (<see cref="Approval.UserId"/>, <see cref="Approval.QuestionId"/>, or <see cref="Approval.QuizId"/>).
/// Numeric values match lookups.id for type = ApprovalEntityType.
/// Add a new member together with its own nullable FK column and a matching lookup row.
/// </summary>
public enum ApprovalEntityType : short
{
    /// <summary>Registration review of an app_users row.</summary>
    User = 2101,

    /// <summary>Question-bank workflow trail for a questions row.</summary>
    Question = 2102,

    /// <summary>Quiz workflow trail for a quizzes row.</summary>
    Quiz = 2103,
}
