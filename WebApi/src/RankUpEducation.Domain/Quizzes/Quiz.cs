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
        int? schoolId,
        int? schoolCampusId,
        string quizTitle,
        string description,
        short quizTypeId,
        short classId,
        short subjectId,
        short? topicId,
        short? difficultyLevelId,
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

    public int? SchoolId { get; private set; }
    public int? SchoolCampusId { get; private set; }
    public string QuizTitle { get; private set; }
    public string Description { get; private set; }
    public short QuizTypeId { get; private set; }
    public short ClassId { get; private set; }
    public short SubjectId { get; private set; }
    public short? TopicId { get; private set; }
    public short? DifficultyLevelId { get; private set; }
    public short TotalQuestions { get; private set; }
    public short? TotalMarks { get; private set; }
    public short? TimeLimitMinutes { get; private set; }
    public short? AllowedAttempts { get; private set; }
    public bool ShuffleQuestions { get; private set; } = true;
    public bool ShuffleOptions { get; private set; } = true;

    /// <summary>Free = jump anywhere; Sequential = prev/next only; Locked = forward only after answering.</summary>
    public string NavigationMode { get; private set; } = "Free";

    /// <summary>
    /// Post-submit review: Full (score + correct + explanations), CorrectAnswers (score + correct),
    /// ScoreOnly, or Withheld (hide score/answers until review is published).
    /// </summary>
    public string ReviewDisplayMode { get; private set; } = "Full";

    /// <summary>Assigned (row-based) or Public (platform catalog + lazy assignment). School-wide targets use assignment rows only.</summary>
    public string AudienceScope { get; private set; } = "Assigned";

    public DateTimeOffset? AudienceStartAt { get; private set; }
    public DateTimeOffset? AudienceEndAt { get; private set; }
    public short? AudienceAllowedAttempts { get; private set; }

    public string Instructions { get; private set; }
    public bool IsActive { get; private set; } = true;
    public string CreatedByName { get; private set; }
    public string? ApprovedBy { get; private set; }
    public string? RejectionReason { get; private set; }
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
        short? topicId,
        short? difficultyLevelId,
        string instructions,
        short? timeLimitMinutes,
        short? allowedAttempts,
        bool shuffleQuestions,
        bool shuffleOptions,
        bool isReviewRequired,
        string? navigationMode = null,
        string? reviewDisplayMode = null)
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
        NavigationMode = NormalizeNavigationMode(navigationMode);
        // Review display modes are retired — results are always Full once review is not pending.
        _ = reviewDisplayMode;
        ReviewDisplayMode = "Full";
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    private static string NormalizeNavigationMode(string? navigationMode)
    {
        var mode = navigationMode.AsTrimmedOrNull() ?? "Free";
        return mode.Equals("Sequential", StringComparison.OrdinalIgnoreCase) ? "Sequential"
            : mode.Equals("Locked", StringComparison.OrdinalIgnoreCase) ? "Locked"
            : "Free";
    }

    /// <summary>Opens public catalog access without requiring pre-created rows for every student.</summary>
    public void SetAudienceAccess(
        string audienceScope,
        DateTimeOffset startAt,
        DateTimeOffset endAt,
        short allowedAttempts)
    {
        var scope = audienceScope.AsTrimmedOrNull() ?? "Assigned";
        // School-wide and multi-school assignment use materialized rows; only Public is open-catalog.
        AudienceScope = scope.Equals("Public", StringComparison.OrdinalIgnoreCase) ? "Public" : "Assigned";
        AudienceStartAt = startAt;
        AudienceEndAt = endAt;
        AudienceAllowedAttempts = allowedAttempts;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>
    /// Recalculates aggregate question count, marks, and time limit (ceil of Σ EstimatedTimeSeconds / 60)
    /// after bank attach or inline add/update/remove. Includes unsaved link changes in the current unit of work.
    /// </summary>
    public void SetQuestionTotals(short totalQuestions, short totalMarks, short? timeLimitMinutes)
    {
        TotalQuestions = totalQuestions;
        TotalMarks = totalMarks;
        TimeLimitMinutes = timeLimitMinutes;
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

    /// <summary>
    /// Teacher publish: moves to Published lifecycle and (re)queues approval as Pending.
    /// Clears prior rejection so the quiz reappears in the admin approval queue.
    /// </summary>
    public void SubmitForApproval(short lifecycleStatusId, short pendingApprovalStatusId)
    {
        if (TotalQuestions <= 0)
        {
            throw new BusinessRuleException("Quiz must contain at least one question.");
        }

        LifecycleStatusId = lifecycleStatusId;
        ApprovalStatusId = pendingApprovalStatusId;
        ApprovedBy = null;
        RejectionReason = null;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>School admin approves a teacher quiz awaiting review.</summary>
    public void Approve(short approvalStatusId, string approvedBy)
    {
        ApprovalStatusId = approvalStatusId;
        ApprovedBy = approvedBy.AsTrimmedString();
        RejectionReason = null;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>School admin rejects a pending teacher quiz; clears prior approver stamp.</summary>
    public void Reject(short approvalStatusId, string? reason = null)
    {
        ApprovalStatusId = approvalStatusId;
        ApprovedBy = null;
        var trimmed = reason.AsTrimmedOrNull();
        RejectionReason = trimmed is null
            ? null
            : trimmed.Length > 1000
                ? trimmed[..1000]
                : trimmed;
        ModifiedDate = DateOnly.FromDateTime(DateTime.UtcNow);
    }

    /// <summary>Soft-deletes a draft quiz (legacy path; prefer hard delete when unassigned).</summary>
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
