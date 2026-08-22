namespace RankUpEducation.Domain.Quizzes;

/// <summary>Lifecycle of a request to edit an approved or published quiz.</summary>
public enum QuizEditRequestStatus : short
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
}
