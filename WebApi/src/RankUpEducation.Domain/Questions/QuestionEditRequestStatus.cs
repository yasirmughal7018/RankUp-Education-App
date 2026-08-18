namespace RankUpEducation.Domain.Questions;

/// <summary>Lifecycle of a request to edit an Active question.</summary>
public enum QuestionEditRequestStatus : short
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
}
