using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Quizzes;

public sealed class QuizReview : BaseEntity
{
    private QuizReview()
    {
        ReviewBy = string.Empty;
    }

    public QuizReview(string reviewBy, long? quizId, long? questionId)
    {
        if ((quizId is null && questionId is null) || (quizId is not null && questionId is not null))
        {
            throw new BusinessRuleException("Review must target either a quiz or a question.");
        }

        ReviewBy = reviewBy.Trim();
        QuizId = quizId;
        QuestionId = questionId;
    }

    public string ReviewBy { get; private set; }
    public short? AiReviewStatus { get; private set; }
    public short? TeacherReviewStatus { get; private set; }
    public short? ParentReviewStatus { get; private set; }
    public string? AiReviewComment { get; private set; }
    public string? TeacherReviewComment { get; private set; }
    public string? ParentReviewComment { get; private set; }
    public long? QuizId { get; private set; }
    public long? QuestionId { get; private set; }
}
