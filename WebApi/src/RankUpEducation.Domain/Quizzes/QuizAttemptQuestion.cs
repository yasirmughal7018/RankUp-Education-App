using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Quizzes;

/// <summary>Snapshot of a bank question as presented in a specific attempt (order may differ from quiz definition).</summary>
public sealed class QuizAttemptQuestion : BaseEntity
{
    private QuizAttemptQuestion()
    {
        QuestionText = string.Empty;
        QuestionTypeName = string.Empty;
    }

    public QuizAttemptQuestion(
        long quizAttemptId,
        long questionId,
        short displayOrder,
        short marks,
        string questionText,
        string questionTypeName,
        string? hint,
        string? explanation,
        short estimatedTimeSeconds)
    {
        QuizAttemptId = quizAttemptId;
        QuestionId = questionId;
        DisplayOrder = displayOrder;
        Marks = marks;
        QuestionText = questionText.AsTrimmedString();
        QuestionTypeName = questionTypeName.AsTrimmedString();
        Hint = hint.AsTrimmedOrNull();
        Explanation = explanation.AsTrimmedOrNull();
        EstimatedTimeSeconds = estimatedTimeSeconds;
    }

    public long QuizAttemptId { get; private set; }
    public long QuestionId { get; private set; }
    public short DisplayOrder { get; private set; }

    /// <summary>Frozen quiz-specific marks at attempt start — later QuizQuestion edits must not change this.</summary>
    public short Marks { get; private set; }

    /// <summary>Frozen stem text at attempt start.</summary>
    public string QuestionText { get; private set; }

    /// <summary>Frozen question type name (e.g. Single Choice) at attempt start.</summary>
    public string QuestionTypeName { get; private set; }

    public string? Hint { get; private set; }
    public string? Explanation { get; private set; }

    /// <summary>Frozen per-question time budget in seconds (0 = unlimited for this question).</summary>
    public short EstimatedTimeSeconds { get; private set; }

    /// <summary>Seconds the student spent focused on this question (client-reported).</summary>
    public short TimeSpentSeconds { get; private set; }

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

    public void UpdateTimeSpent(short timeSpentSeconds)
    {
        TimeSpentSeconds = (short)Math.Clamp((int)timeSpentSeconds, 0, short.MaxValue);
    }
}
