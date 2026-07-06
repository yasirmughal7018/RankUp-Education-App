using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Quizzes;

public sealed class Quiz : SoftDeleteEntity
{
    private Quiz()
    {
        QuizTitle = string.Empty;
        Description = string.Empty;
        CreatedByName = string.Empty;
        Instructions = string.Empty;
    }

    public Quiz(
        int schoolId,
        int schoolCampusId,
        string quizTitle,
        string description,
        short quizTypeId,
        short classId,
        short subjectId,
        short topicId,
        short difficultyLevelId,
        short totalQuestions,
        string instructions,
        string createdBy,
        short approvalStatusId,
        short lifecycleStatusId)
    {
        SchoolId = schoolId;
        SchoolCampusId = schoolCampusId;
        QuizTitle = quizTitle.Trim();
        Description = description.Trim();
        QuizTypeId = quizTypeId;
        ClassId = classId;
        SubjectId = subjectId;
        TopicId = topicId;
        DifficultyLevelId = difficultyLevelId;
        TotalQuestions = totalQuestions;
        Instructions = instructions.Trim();
        CreatedByName = createdBy.Trim();
        ApprovalStatusId = approvalStatusId;
        LifecycleStatusId = lifecycleStatusId;
    }

    public int SchoolId { get; private set; }
    public int SchoolCampusId { get; private set; }
    public string QuizTitle { get; private set; }
    public string Description { get; private set; }
    public short QuizTypeId { get; private set; }
    public short ClassId { get; private set; }
    public short SubjectId { get; private set; }
    public short TopicId { get; private set; }
    public short DifficultyLevelId { get; private set; }
    public short TotalQuestions { get; private set; }
    public short? TotalMarks { get; private set; }
    public short? TimeLimitMinutes { get; private set; }
    public short? AllowedAttempts { get; private set; }
    public bool ShuffleQuestions { get; private set; } = true;
    public bool ShuffleOptions { get; private set; } = true;
    public string Instructions { get; private set; }
    public bool IsActive { get; private set; } = true;
    public string CreatedByName { get; private set; }
    public string? ApprovedBy { get; private set; }
    public short ApprovalStatusId { get; private set; }
    public short LifecycleStatusId { get; private set; }
    public DateOnly CreatedDate { get; private set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public DateOnly? ModifiedDate { get; private set; }
    public bool IsReviewRequired { get; private set; } = true;

    public void Publish()
    {
        if (TotalQuestions <= 0)
        {
            throw new BusinessRuleException("Quiz must contain at least one question.");
        }
    }
}
