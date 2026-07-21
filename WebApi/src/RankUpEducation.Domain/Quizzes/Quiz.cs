using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Quizzes;

/// <summary>
/// Quiz aggregate scoped to a school campus. Created in Draft; teachers publish into pending approval,
/// admins/parents may publish directly. Lifecycle progresses Draft → Published → Assigned → Archived.
/// </summary>
public sealed class Quiz : SoftDeleteEntity
{
    private Quiz()
    {
        QuizTitle = string.Empty;
        Description = string.Empty;
        CreatedByName = string.Empty;
        Instructions = string.Empty;
    }

    /// <summary>Creates a quiz with zero questions; totals are set when questions are attached.</summary>
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
        QuizTitle = quizTitle.AsTrimmedString();
        Description = description.AsTrimmedString();
        QuizTypeId = quizTypeId;
        ClassId = classId;
        SubjectId = subjectId;
        TopicId = topicId;
        DifficultyLevelId = difficultyLevelId;
        TotalQuestions = totalQuestions;
        Instructions = instructions.AsTrimmedString();
        CreatedByName = createdBy.AsTrimmedString();
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

    /// <summary>Updates editable metadata while the quiz remains in an editable lifecycle state.</summary>
    public void UpdateDetails(
        string quizTitle,
        string description,
        short classId,
        short subjectId,
        short topicId,
        short difficultyLevelId,
        string instructions,
        short? timeLimitMinutes,
        short? allowedAttempts,
        bool shuffleQuestions,
        bool shuffleOptions,
        bool isReviewRequired)
    {
        QuizTitle = quizTitle.AsTrimmedString();
        Description = description.AsTrimmedString();
        ClassId = classId;
        SubjectId = subjectId;
        TopicId = topicId;
        DifficultyLevelId = difficultyLevelId;
        Instructions = instructions.AsTrimmedString();
        TimeLimitMinutes = timeLimitMinutes;
        AllowedAttempts = allowedAttempts;
        ShuffleQuestions = shuffleQuestions;
        ShuffleOptions = shuffleOptions;
        IsReviewRequired = isReviewRequired;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>Recalculates aggregate question count and marks after bank attach or inline add/remove.</summary>
    public void SetQuestionTotals(short totalQuestions, short totalMarks)
    {
        TotalQuestions = totalQuestions;
        TotalMarks = totalMarks;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>Moves lifecycle (e.g. Published → Assigned after assignment, or Cancelled).</summary>
    public void SetLifecycleStatus(short lifecycleStatusId)
    {
        LifecycleStatusId = lifecycleStatusId;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>Parent/admin publish: sets lifecycle to Published and stamps approval in one step.</summary>
    public void Publish(short lifecycleStatusId, short approvalStatusId, string? approvedBy)
    {
        if (TotalQuestions <= 0)
        {
            throw new BusinessRuleException("Quiz must contain at least one question.");
        }

        LifecycleStatusId = lifecycleStatusId;
        ApprovalStatusId = approvalStatusId;
        ApprovedBy = approvedBy;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>Teacher publish: moves to Published lifecycle while approval remains pending.</summary>
    public void SubmitForApproval(short lifecycleStatusId)
    {
        if (TotalQuestions <= 0)
        {
            throw new BusinessRuleException("Quiz must contain at least one question.");
        }

        LifecycleStatusId = lifecycleStatusId;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>School admin approves a teacher quiz awaiting review.</summary>
    public void Approve(short approvalStatusId, string approvedBy)
    {
        ApprovalStatusId = approvalStatusId;
        ApprovedBy = approvedBy.AsTrimmedString();
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>School admin rejects a pending teacher quiz; clears prior approver stamp.</summary>
    public void Reject(short approvalStatusId)
    {
        ApprovalStatusId = approvalStatusId;
        ApprovedBy = null;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>Soft-deletes a draft quiz; only allowed when no assignments exist.</summary>
    public void MarkDeleted(DateTimeOffset deletedAt, long? deletedBy)
    {
        SoftDelete(deletedAt, deletedBy);
        IsActive = false;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>Retires a published/assigned quiz; makes it inactive and read-only.</summary>
    public void Archive(short lifecycleStatusId)
    {
        LifecycleStatusId = lifecycleStatusId;
        IsActive = false;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }
}
