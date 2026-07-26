using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Quizzes;

/// <summary>Snapshot of a bank question as presented in a specific attempt (order may differ from quiz definition).</summary>
public sealed class QuizAttemptQuestion : BaseEntity
{
    private QuizAttemptQuestion()
    {
    }

    public QuizAttemptQuestion(long quizAttemptId, long questionId, short displayOrder, short marks)
    {
        QuizAttemptId = quizAttemptId;
        QuestionId = questionId;
        DisplayOrder = displayOrder;
        Marks = marks;
    }

    public long QuizAttemptId { get; private set; }
    public long QuestionId { get; private set; }
    public short DisplayOrder { get; private set; }

    /// <summary>Frozen quiz-specific marks at attempt start — later QuizQuestion edits must not change this.</summary>
    public short Marks { get; private set; }

    public long? QuizReviewId { get; private set; }
    public bool IsMarkedForReview { get; private set; }

    /// <summary>Associates per-question teacher/parent/AI feedback with this attempt row.</summary>
    public void LinkReview(long quizReviewId)
    {
        QuizReviewId = quizReviewId;
    }

    /// <summary>Student flag to revisit this question before submit.</summary>
    public void SetMarkedForReview(bool isMarkedForReview)
    {
        IsMarkedForReview = isMarkedForReview;
    }
}
