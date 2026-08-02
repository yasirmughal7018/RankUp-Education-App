namespace RankUpEducation.Application.Quizzes;

/// <summary>Canonical lookup type names and alias groups used across quiz lifecycle, scoring, and question types.</summary>
public static class QuizLookupNames
{
    public const string QuizType = "QuizType";
    public const string QuizLifecycleStatus = "QuizLifecycleStatus";
    public const string QuizApprovalStatus = "QuizApprovalStatus";
    public const string QuizResultStatus = "QuizResultStatus";
    public const string QuizAttemptStatus = "QuizAttemptStatus";
    public const string QuestionType = "QuestionType";
    public const string QuestionStatus = "QuestionStatus";

    /// <summary>Canonical IDs aligned with the deployed quiz lookup table.</summary>
    public static class QuizTypeIds
    {
        public const short Practice = 1;
        public const short Assessment = 2;
        public const short Competition = 3;
        public const short Surprise = 4;
        public const short ParentPrivate = 5;
    }

    /// <summary>
    /// Approval gate: Pending → SchoolApproved (school/campus) → Approved (portal).
    /// Rejected is terminal for admin approve until the teacher re-submits to Pending.
    /// Legacy 41/42 (Under Teacher/AI Review) and 43 (Cancelled) are remapped/deactivated.
    /// </summary>
    public static class QuizApprovalStatusIds
    {
        /// <summary>Row 40; renamed from legacy 'Draft' — awaiting first approval.</summary>
        public const short Pending = 40;
        /// <summary>School or campus admin endorsed; awaiting portal final approval.</summary>
        public const short SchoolApproved = 46;
        public const short Approved = 44;
        public const short Rejected = 45;
    }

    /// <summary>
    /// Quiz-definition lifecycle only: NotAssigned → Published → Assigned → Cancelled / Archived.
    /// Legacy rows 63 ('In Progress:') and 64 (Completed) are deactivated — per-student
    /// progress lives on attempts/results, never on the quiz row.
    /// </summary>
    public static class QuizLifecycleStatusIds
    {
        public const short NotAssigned = 60;
        public const short Published = 61;
        public const short Assigned = 62;
        public const short Cancelled = 65;
        public const short Archived = 66;
    }

    public static class QuizAttemptStatusIds
    {
        public const short Started = 80;
        public const short InProgress = 81;
        public const short Submitted = 82;
        public const short AutoSubmitted = 83;
        public const short Expired = 84;
        public const short Reviewed = 85;
    }

    public static class QuizResultStatusIds
    {
        public const short Expired = 20;
        public const short Completed = 21;
        public const short UnderReview = 22;
        public const short InProgress = 23;
        public const short NotAttempted = 24;
        public const short Upcoming = 25;
    }

    /// <summary>Canonical QuestionStatus lookup IDs (seeded / preferred for writes).</summary>
    public static class QuestionStatusIds
    {
        public const short Draft = 110;
        public const short PendingReview = 111;
        public const short Approved = 112;
        public const short Rejected = 113;
        public const short Archived = 114;
    }

    /// <summary>Canonical QuestionType lookup IDs (seeded / preferred for writes).</summary>
    public static class QuestionTypeIds
    {
        public const short SingleChoice = 100;
        public const short MultipleChoice = 101;
        public const short TrueFalse = 102;
        public const short FillInTheBlanks = 103;
        public const short Descriptive = 104;
        public const short FileUpload = 105;
        public const short Matching = 106;
        public const short Ordering = 107;
        public const short Media = 108;
    }

    /// <summary>Canonical DifficultyLevel lookup IDs (seeded / preferred for writes).</summary>
    public static class DifficultyLevelIds
    {
        public const short Easy = 2001;
        public const short Medium = 2002;
        public const short Hard = 2003;
    }

    public const string DifficultyLevel = "DifficultyLevel";

    public static readonly string[] EasyDifficultyNames = ["Easy"];
    public static readonly string[] MediumDifficultyNames = ["Medium"];
    public static readonly string[] HardDifficultyNames = ["Hard"];

    public static readonly string[] ParentPrivateQuizTypeNames = ["ParentPrivate", "Parent Private", "Private"];
    public static readonly string[] SchoolQuizTypeNames = ["Practice", "Assessment", "Competition", "Surprise"];
    public static readonly string[] PendingApprovalStatusNames = ["Pending", "Draft", "Under Review"];
    public static readonly string[] SchoolApprovedStatusNames = ["SchoolApproved", "School Approved"];
    // The deployed lookup table calls the initial editable lifecycle "Not Assigned".
    public static readonly string[] DraftLifecycleNames = ["Not Assigned", "Draft", "DRAFT"];
    public static readonly string[] PublishedLifecycleNames = ["Published", "PUBLISHED"];
    public static readonly string[] AssignedLifecycleNames = ["Assigned", "ASSIGNED"];
    public static readonly string[] CancelledLifecycleNames = ["Cancelled", "CANCELLED"];
    public static readonly string[] ArchivedLifecycleNames = ["Archived", "ARCHIVED"];
    public static readonly string[] ApprovedStatusNames = ["Approved", "APPROVED"];
    /// <summary>Canonical reject status name for writes.</summary>
    public static readonly string[] RejectedApprovalStatusNames = ["Rejected", "REJECTED"];
    /// <summary>Legacy deny labels still recognized when reading older rows.</summary>
    public static readonly string[] RejectedApprovalAliasNames =
        ["Rejected", "Declined", "Cancelled", "REJECTED"];

    public static bool IsPendingApprovalName(string? name)
        => !string.IsNullOrWhiteSpace(name)
           && PendingApprovalStatusNames.Any(n => n.Equals(name, StringComparison.OrdinalIgnoreCase));

    public static bool IsSchoolApprovedName(string? name)
        => !string.IsNullOrWhiteSpace(name)
           && SchoolApprovedStatusNames.Any(n => n.Equals(name, StringComparison.OrdinalIgnoreCase));

    public static bool IsFinalApprovedName(string? name)
        => !string.IsNullOrWhiteSpace(name)
           && ApprovedStatusNames.Any(n => n.Equals(name, StringComparison.OrdinalIgnoreCase));

    public static bool IsRejectedApprovalName(string? name)
        => !string.IsNullOrWhiteSpace(name)
           && RejectedApprovalAliasNames.Any(n => n.Equals(name, StringComparison.OrdinalIgnoreCase));
    public static readonly string[] AssignedResultNames =
        ["Not Attempted", "Assigned", "Not Started", "Pending"];

    public static readonly string[] UpcomingResultNames =
        ["Up Coming", "Upcoming"];

    /// <summary>Single-select option questions (exactly one correct).</summary>
    public static readonly string[] SingleChoiceQuestionTypeNames =
    [
        "Single Choice",
        "SingleChoice",
        "MCQ"
    ];

    /// <summary>Multi-select option questions (one or more correct).</summary>
    public static readonly string[] MultiSelectQuestionTypeNames =
    [
        "Multiple Choice",
        "MultipleChoice",
        "Multi Select",
        "MultiSelect",
        "Multiple"
    ];

    public static readonly string[] TrueFalseQuestionTypeNames =
    [
        "True/False",
        "TrueFalse",
        "True / False"
    ];

    public static readonly string[] FillBlankQuestionTypeNames =
    [
        "Fill in the Blanks",
        "Fill in the Blank",
        "FillBlank",
        "Fill Blanks"
    ];

    public static readonly string[] DescriptiveQuestionTypeNames =
    [
        "Descriptive",
        "Short Answer",
        "ShortAnswer"
    ];

    public static readonly string[] FileUploadQuestionTypeNames =
    [
        "File Upload",
        "File",
        "File Answer",
        "FileUpload"
    ];

    public static readonly string[] MatchingQuestionTypeNames =
    [
        "Matching",
        "Match"
    ];

    public static readonly string[] OrderingQuestionTypeNames =
    [
        "Ordering",
        "Order",
        "Sequence"
    ];

    public static readonly string[] MediaQuestionTypeNames =
    [
        "Media",
        "Media Question",
        "Image Choice"
    ];

    /// <summary>Legacy alias — single-choice style MCQ names.</summary>
    public static readonly string[] McqQuestionTypeNames = SingleChoiceQuestionTypeNames;

    public static readonly string[] DraftQuestionStatusNames = ["Draft"];
    /// <summary>Canonical write/resolve name for pending review.</summary>
    public static readonly string[] PendingQuestionStatusNames = ["PendingReview"];
    /// <summary>Legacy names still treated as pending when reading old rows.</summary>
    public static readonly string[] PendingQuestionStatusLegacyAliases = ["Pending", "Under Review"];
    public static readonly string[] ApprovedQuestionStatusNames = ["Approved"];
    public static readonly string[] ApprovedQuestionStatusLegacyAliases = ["Active", "Published"];
    public static readonly string[] RejectedQuestionStatusNames = ["Rejected"];
    public static readonly string[] RejectedQuestionStatusLegacyAliases = ["Declined"];
    public static readonly string[] ArchivedQuestionStatusNames = ["Archived"];
    /// <summary>Statuses owners may still edit/delete (not Approved / Archived). Draft removed from product flow.</summary>
    public static readonly string[] OwnerEditableQuestionStatusNames =
    [
        "PendingReview",
        "Pending",
        "Under Review",
        "Rejected",
        "Declined",
        // Legacy Draft rows remain editable until migrated to PendingReview.
        "Draft"
    ];
    /// <summary>Status used when creating inline quiz questions (quiz-ready).</summary>
    public static readonly string[] ActiveQuestionStatusNames = ["Approved"];
    public static readonly string[] SubmittedAttemptStatusNames =
        ["Submitted", "SUBMITTED", "AutoSubmitted", "AUTOSUBMITTED"];
    public static readonly string[] ReviewedAttemptStatusNames = ["Reviewed", "REVIEWED"];
    public static readonly string[] CompletedResultNames = ["Completed", "Reviewed"];

    public static bool IsPendingQuestionStatusName(string statusName)
        => MatchesAny(statusName, PendingQuestionStatusNames)
            || MatchesAny(statusName, PendingQuestionStatusLegacyAliases);

    public static bool IsApprovedQuestionStatusName(string statusName)
        => MatchesAny(statusName, ApprovedQuestionStatusNames)
            || MatchesAny(statusName, ApprovedQuestionStatusLegacyAliases);

    public static bool IsRejectedQuestionStatusName(string statusName)
        => MatchesAny(statusName, RejectedQuestionStatusNames)
            || MatchesAny(statusName, RejectedQuestionStatusLegacyAliases);

    public static bool IsArchivedQuestionStatusName(string statusName)
        => MatchesAny(statusName, ArchivedQuestionStatusNames);

    public static bool IsOwnerEditableQuestionStatusName(string statusName)
        => MatchesAny(statusName, OwnerEditableQuestionStatusNames);

    public static bool IsPendingQuestionStatusId(short statusId)
        => statusId == QuestionStatusIds.PendingReview;

    public static bool IsApprovedQuestionStatusId(short statusId)
        => statusId == QuestionStatusIds.Approved;

    public static bool IsRejectedQuestionStatusId(short statusId)
        => statusId == QuestionStatusIds.Rejected;

    public static bool IsArchivedQuestionStatusId(short statusId)
        => statusId == QuestionStatusIds.Archived;

    public static bool IsDraftQuestionStatusId(short statusId)
        => statusId == QuestionStatusIds.Draft;

    public static bool IsOwnerEditableQuestionStatusId(short statusId)
        => statusId is QuestionStatusIds.Draft
            or QuestionStatusIds.PendingReview
            or QuestionStatusIds.Rejected;

    private static bool MatchesAny(string value, IReadOnlyList<string> names)
        => names.Any(name => name.Equals(value, StringComparison.OrdinalIgnoreCase));
}
