using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Questions;

/// <summary>
/// Question-bank entity. Create stamps org + <see cref="CreatedByRole"/> from the creator.
/// Non–PortalAdmin create enters PendingReview (inactive) until a higher-tier admin endorses
/// or PortalAdmin publishes. PortalAdmin create auto-publishes (Public + Active).
/// CampusAdmin/SchoolAdmin approval is an endorsement (Approved + Campus/School, Inactive).
/// Only PortalAdmin publish sets Public + Active (quiz-usable).
/// </summary>
public sealed class Question : BaseEntity
{
    private readonly List<QuestionOption> _options = [];
    private readonly List<QuestionAcceptedAnswer> _acceptedAnswers = [];

    private Question()
    {
        QuestionText = string.Empty;
    }

    /// <summary>Creates a bank question; callers then set org scope and submit or publish.</summary>
    public Question(
        string questionText,
        short questionTypeId,
        short classId,
        short subjectId,
        short? topicId,
        short difficultyLevel,
        short statusId,
        long createdByUserId,
        UserRole createdByRole,
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
        CreatedBy = createdByUserId;
        CreatedByRole = createdByRole;
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
    /// <summary>Creator user id (<c>app_users.id</c>).</summary>
    public long CreatedBy { get; private set; }
    /// <summary>Role the creator was acting as when the question was created (approval hierarchy).</summary>
    public UserRole CreatedByRole { get; private set; }
    /// <summary>Approver user id (<c>app_users.id</c>), null until endorsed/published.</summary>
    public long? ApprovedBy { get; private set; }
    public DateOnly CreatedDate { get; private set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public DateOnly ModifiedDate { get; private set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    /// <summary>
    /// Legacy quiz-eligibility marker. Prefer <see cref="IsEligibleForQuiz"/>.
    /// </summary>
    public bool IsAiApproved { get; private set; }
    public string? RejectionReason { get; private set; }

    /// <summary>Owning school stamped from creator (nullable for PortalAdmin-created).</summary>
    public int? SchoolId { get; private set; }

    /// <summary>Owning campus stamped from creator (nullable for school/portal scope).</summary>
    public int? CampusId { get; private set; }

    /// <summary>
    /// Visibility after endorse/publish: None / Campus / School / Public.
    /// See <see cref="QuestionVisibilityLevels"/>.
    /// </summary>
    public short VisibilityLevel { get; private set; }

    public IReadOnlyCollection<QuestionOption> Options => _options;
    public IReadOnlyCollection<QuestionAcceptedAnswer> AcceptedAnswers => _acceptedAnswers;

    /// <summary>Stamps creator (or backfilled approver) org for Campus/School queues and visibility.</summary>
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

    /// <summary>Soft-hides a Published question from quiz use while keeping Approved status.</summary>
    public void Deactivate()
    {
        IsActive = false;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>Re-enables quiz use for a Published question (PortalAdmin lifecycle).</summary>
    public void Activate()
    {
        IsActive = true;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>
    /// Submit (or resubmit) for admin review. Clears prior endorsement / rejection / visibility.
    /// PendingReview is always inactive until PortalAdmin publishes.
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
    /// Admin endorse or publish.
    /// Campus/School visibility = endorsement (Inactive, restricted).
    /// Public visibility = publish (Active, quiz-usable).
    /// </summary>
    public void Approve(
        long approvedByUserId,
        short approvedStatusId,
        short visibilityLevel,
        bool publish)
    {
        if (!QuestionVisibilityLevels.IsValidApprovedLevel(visibilityLevel))
        {
            throw new ArgumentOutOfRangeException(
                nameof(visibilityLevel),
                "Approved questions require Campus, School, or Public visibility.");
        }

        if (publish && visibilityLevel != QuestionVisibilityLevels.Public)
        {
            throw new ArgumentOutOfRangeException(
                nameof(visibilityLevel),
                "Publish requires Public visibility.");
        }

        if (!publish && visibilityLevel == QuestionVisibilityLevels.Public)
        {
            throw new ArgumentOutOfRangeException(
                nameof(visibilityLevel),
                "Public visibility requires publish=true.");
        }

        if (approvedByUserId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(approvedByUserId), "Approver user id is required.");
        }

        StatusId = approvedStatusId;
        ApprovedBy = approvedByUserId;
        IsAiApproved = true;
        RejectionReason = null;
        VisibilityLevel = visibilityLevel;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
        IsActive = publish;
    }

    /// <summary>
    /// Immediately usable approval (PortalAdmin publish or inline quiz-created questions).
    /// Always sets IsActive=true. Bank endorsements must use <see cref="Approve"/> with publish=false.
    /// </summary>
    public void MarkFullyApproved(
        long approvedByUserId,
        short approvedStatusId,
        short visibilityLevel = QuestionVisibilityLevels.Public)
    {
        if (!QuestionVisibilityLevels.IsValidApprovedLevel(visibilityLevel))
        {
            throw new ArgumentOutOfRangeException(
                nameof(visibilityLevel),
                "Approved questions require Campus, School, or Public visibility.");
        }

        if (approvedByUserId <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(approvedByUserId), "Approver user id is required.");
        }

        StatusId = approvedStatusId;
        ApprovedBy = approvedByUserId;
        IsAiApproved = true;
        RejectionReason = null;
        VisibilityLevel = visibilityLevel;
        IsActive = true;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>
    /// Upgrades visibility only when <paramref name="visibilityLevel"/> is strictly higher
    /// (Public &gt; School &gt; Campus &gt; None). Never downgrades an existing higher level.
    /// </summary>
    public void RaiseVisibilityIfHigher(
        long approvedByUserId,
        short approvedStatusId,
        short visibilityLevel)
    {
        if (visibilityLevel <= VisibilityLevel)
        {
            return;
        }

        MarkFullyApproved(approvedByUserId, approvedStatusId, visibilityLevel);
    }

    /// <summary>
    /// Soft quiz-use flags: active + ApprovedBy + Public (PortalAdmin-published).
    /// Callers must also verify Approved status.
    /// </summary>
    public bool IsEligibleForQuiz
        => IsActive
           && ApprovedBy.HasValue
           && QuestionVisibilityLevels.IsPublished(VisibilityLevel);

    /// <summary>Moves to Archived and deactivates; PortalAdmin-only in application layer.</summary>
    public void Archive(short archivedStatusId)
    {
        StatusId = archivedStatusId;
        IsActive = false;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>
    /// Restores an Archived question. Visibility is preserved from before archive:
    /// Public → Approved + Active; Campus/School → Approved + Inactive; None → PendingReview + Inactive.
    /// </summary>
    public void Unarchive(short restoredStatusId)
    {
        StatusId = restoredStatusId;
        IsActive = QuestionVisibilityLevels.IsPublished(VisibilityLevel);
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
