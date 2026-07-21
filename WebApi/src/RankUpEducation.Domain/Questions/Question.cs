using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Questions;

/// <summary>
/// Question-bank entity. Create stamps <see cref="SchoolId"/> / <see cref="CampusId"/> from the creator
/// and enters PendingReview (inactive) until an admin approves.
/// Approval sets <see cref="VisibilityLevel"/> by role:
/// CampusAdmin → Campus, SchoolAdmin → School, PortalAdmin → Public.
/// Activate / deactivate / archive are PortalAdmin-only (enforced in application layer).
/// </summary>
public sealed class Question : BaseEntity
{
    private readonly List<QuestionOption> _options = [];
    private readonly List<QuestionAcceptedAnswer> _acceptedAnswers = [];

    private Question()
    {
        QuestionText = string.Empty;
        CreatedBy = string.Empty;
    }

    /// <summary>Creates a bank question; callers should then <see cref="SetOrgScope"/> and <see cref="SubmitForApproval"/>.</summary>
    public Question(
        string questionText,
        short questionTypeId,
        short classId,
        short subjectId,
        short? topicId,
        short difficultyLevel,
        short statusId,
        string createdBy,
        short estimatedTimeSeconds,
        short marks)
    {
        QuestionText = questionText.AsTrimmedString();
        QuestionTypeId = questionTypeId;
        ClassId = classId;
        SubjectId = subjectId;
        TopicId = topicId;
        DifficultyLevel = difficultyLevel;
        StatusId = statusId;
        CreatedBy = createdBy.AsTrimmedString();
        EstimatedTimeSeconds = estimatedTimeSeconds;
        Marks = marks;
    }

    public string QuestionText { get; private set; }
    public short QuestionTypeId { get; private set; }
    public short ClassId { get; private set; }
    public short SubjectId { get; private set; }
    public short? TopicId { get; private set; }
    public short DifficultyLevel { get; private set; }
    public string? Explanation { get; private set; }
    public string? Hint { get; private set; }
    public short EstimatedTimeSeconds { get; private set; }
    public short Marks { get; private set; }
    public bool IsActive { get; private set; }
    public short StatusId { get; private set; }
    public string CreatedBy { get; private set; }
    public string? ApprovedBy { get; private set; }
    public DateOnly CreatedDate { get; private set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public DateOnly ModifiedDate { get; private set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    /// <summary>
    /// Legacy quiz-eligibility marker. Approve sets this true so existing
    /// quiz-attach SQL remains compatible. Prefer <see cref="IsEligibleForQuiz"/>.
    /// </summary>
    public bool IsAiApproved { get; private set; }
    public string? RejectionReason { get; private set; }

    /// <summary>Owning school stamped from creator (nullable for PortalAdmin-created).</summary>
    public int? SchoolId { get; private set; }

    /// <summary>Owning campus stamped from creator (nullable for school/portal scope).</summary>
    public int? CampusId { get; private set; }

    /// <summary>
    /// Visibility after approval: None / Campus / School / Public.
    /// See <see cref="QuestionVisibilityLevels"/>.
    /// </summary>
    public short VisibilityLevel { get; private set; }

    public IReadOnlyCollection<QuestionOption> Options => _options;
    public IReadOnlyCollection<QuestionAcceptedAnswer> AcceptedAnswers => _acceptedAnswers;

    /// <summary>Stamps creator (or backfilled approver) org for Campus/School approval queues and visibility.</summary>
    public void SetOrgScope(int? schoolId, int? campusId)
    {
        SchoolId = schoolId;
        CampusId = campusId;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>Updates content fields; does not change status, approval, or visibility.</summary>
    public void UpdateDetails(
        string questionText,
        short questionTypeId,
        short classId,
        short subjectId,
        short? topicId,
        short difficultyLevel,
        short estimatedTimeSeconds,
        short marks,
        string? hint,
        string? explanation)
    {
        QuestionText = questionText.AsTrimmedString();
        QuestionTypeId = questionTypeId;
        ClassId = classId;
        SubjectId = subjectId;
        TopicId = topicId;
        DifficultyLevel = difficultyLevel;
        EstimatedTimeSeconds = estimatedTimeSeconds;
        Marks = marks;
        Hint = hint.AsTrimmedOrNull();
        Explanation = explanation.AsTrimmedOrNull();
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>Soft-hides an Approved question from quiz use while keeping Approved status.</summary>
    public void Deactivate()
    {
        IsActive = false;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>Re-enables quiz use for an Approved question (PortalAdmin lifecycle).</summary>
    public void Activate()
    {
        IsActive = true;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>
    /// Submit (or resubmit) for admin review. Clears prior approval / rejection / visibility.
    /// PendingReview is always inactive until Approve.
    /// </summary>
    public void SubmitForApproval(short pendingReviewStatusId)
    {
        StatusId = pendingReviewStatusId;
        ApprovedBy = null;
        IsAiApproved = false;
        RejectionReason = null;
        VisibilityLevel = QuestionVisibilityLevels.None;
        IsActive = false;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>
    /// Admin approval. Sets visibility by approver role:
    /// CampusAdmin → Campus, SchoolAdmin → School, PortalAdmin → Public.
    /// IsActive becomes true (only Approved is active by default).
    /// </summary>
    public void Approve(string approvedBy, short approvedStatusId, short visibilityLevel)
    {
        if (!QuestionVisibilityLevels.IsValidApprovedLevel(visibilityLevel))
        {
            throw new ArgumentOutOfRangeException(
                nameof(visibilityLevel),
                "Approved questions require Campus, School, or Public visibility.");
        }

        StatusId = approvedStatusId;
        ApprovedBy = approvedBy.AsTrimmedString();
        IsAiApproved = true;
        RejectionReason = null;
        VisibilityLevel = visibilityLevel;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
        IsActive = true;
    }

    /// <summary>Kept for inline quiz-created questions and legacy callers.</summary>
    public void MarkFullyApproved(
        string approvedBy,
        short approvedStatusId,
        short visibilityLevel = QuestionVisibilityLevels.Public)
        => Approve(approvedBy, approvedStatusId, visibilityLevel);

    /// <summary>Quiz bank eligibility: active + approved with a visibility level.</summary>
    public bool IsEligibleForQuiz
        => IsActive
           && ApprovedBy.HasTrimmedText()
           && QuestionVisibilityLevels.IsValidApprovedLevel(VisibilityLevel);

    /// <summary>Moves to Archived and deactivates; PortalAdmin-only in application layer.</summary>
    public void Archive(short archivedStatusId)
    {
        StatusId = archivedStatusId;
        IsActive = false;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>
    /// Admin reject — clears approval and visibility (None), deactivates.
    /// Reason is required (validated by application layer); truncated to 1000 chars.
    /// </summary>
    public void Reject(short rejectedStatusId, string reason)
    {
        var trimmedReason = reason.AsTrimmedString();
        StatusId = rejectedStatusId;
        ApprovedBy = null;
        IsAiApproved = false;
        VisibilityLevel = QuestionVisibilityLevels.None;
        IsActive = false;
        RejectionReason = trimmedReason.Length > 1000
            ? trimmedReason[..1000]
            : trimmedReason;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>Adds a choice option (Single/Multi/TrueFalse); Fill uses accepted answers instead.</summary>
    public QuestionOption AddOption(string optionText, bool isCorrect)
    {
        var option = new QuestionOption(Id, optionText, isCorrect);
        _options.Add(option);
        return option;
    }
}
