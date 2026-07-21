using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Questions;

public sealed class Question : BaseEntity
{
    private readonly List<QuestionOption> _options = [];
    private readonly List<QuestionAcceptedAnswer> _acceptedAnswers = [];

    private Question()
    {
        QuestionText = string.Empty;
        CreatedBy = string.Empty;
    }

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
    /// Legacy quiz-eligibility marker. PortalAdmin Approve sets this true so existing
    /// quiz-attach SQL remains compatible. Prefer <see cref="IsEligibleForQuiz"/>.
    /// </summary>
    public bool IsAiApproved { get; private set; }
    public string? RejectionReason { get; private set; }
    public IReadOnlyCollection<QuestionOption> Options => _options;
    public IReadOnlyCollection<QuestionAcceptedAnswer> AcceptedAnswers => _acceptedAnswers;

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

    /// <summary>Only Approved questions may be activated (quiz visibility).</summary>
    public void Deactivate()
    {
        IsActive = false;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>Only Approved questions may be activated (quiz visibility).</summary>
    public void Activate()
    {
        IsActive = true;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>
    /// Submit (or resubmit) for PortalAdmin review. Clears prior approval / rejection.
    /// PendingReview is always inactive until Approve.
    /// </summary>
    public void SubmitForApproval(short pendingReviewStatusId)
    {
        StatusId = pendingReviewStatusId;
        ApprovedBy = null;
        IsAiApproved = false;
        RejectionReason = null;
        IsActive = false;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>
    /// PortalAdmin approval. Marks quiz-eligible; IsActive becomes true (only Approved is active).
    /// </summary>
    public void Approve(string approvedBy, short approvedStatusId)
    {
        StatusId = approvedStatusId;
        ApprovedBy = approvedBy.AsTrimmedString();
        IsAiApproved = true;
        RejectionReason = null;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
        IsActive = true;
    }

    /// <summary>Kept for inline quiz-created questions and legacy callers.</summary>
    public void MarkFullyApproved(string approvedBy, short approvedStatusId)
        => Approve(approvedBy, approvedStatusId);

    /// <summary>Quiz bank eligibility: active + PortalAdmin approved.</summary>
    public bool IsEligibleForQuiz
        => IsActive && ApprovedBy.HasTrimmedText();

    public void Archive(short archivedStatusId)
    {
        StatusId = archivedStatusId;
        IsActive = false;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>PortalAdmin reject — reason is required (validated by application layer).</summary>
    public void Reject(short rejectedStatusId, string reason)
    {
        var trimmedReason = reason.AsTrimmedString();
        StatusId = rejectedStatusId;
        ApprovedBy = null;
        IsAiApproved = false;
        IsActive = false;
        RejectionReason = trimmedReason.Length > 1000
            ? trimmedReason[..1000]
            : trimmedReason;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    public QuestionOption AddOption(string optionText, bool isCorrect)
    {
        var option = new QuestionOption(Id, optionText, isCorrect);
        _options.Add(option);
        return option;
    }
}
