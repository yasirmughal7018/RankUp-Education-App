namespace RankUpEducation.Application.Lookups;

/// <summary>Canonical lookup type names, IDs, and alias groups used across quizzes, questions, and related flows.</summary>
public static class LookupNames
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
    }

    /// <summary>
    /// Approval gate: Pending -> SchoolApproved (school/campus) -> Approved (portal).
    /// Rejected is terminal for admin approve until the teacher re-submits to Pending.
    /// Canonical IDs: 40-43. Older 44/45/46 rows are remapped and deactivated by the initializer.
    /// </summary>
    public static class QuizApprovalStatusIds
    {
        /// <summary>Awaiting school/campus review.</summary>
        public const short Pending = 40;
        /// <summary>School or campus admin endorsed a Teacher/Coordinator quiz; awaiting portal final approval.</summary>
        public const short SchoolApproved = 41;
        public const short Approved = 42;
        public const short Rejected = 43;
    }

    /// <summary>
    /// Quiz-definition lifecycle only: Draft -> Published -> Assigned -> Archived.
    /// Completed / In Progress / Cancelled are not quiz-lifecycle states (deactivated).
    /// </summary>
    public static class QuizLifecycleStatusIds
    {
        public const short Draft = 60;
        public const short Published = 61;
        public const short Assigned = 62;
        public const short Archived = 63;
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
    public const string Class = "Class";

    public static readonly string[] EasyDifficultyNames = ["Easy"];
    public static readonly string[] MediumDifficultyNames = ["Medium"];
    public static readonly string[] HardDifficultyNames = ["Hard"];

    public static readonly string[] SchoolQuizTypeNames = ["Practice", "Assessment", "Competition", "Surprise"];
    /// <summary>
    /// Canonical QuizApprovalStatus write name (lookup id 40). There are exactly four
    /// approval lookups: Pending, SchoolApproved, Approved, Rejected.
    /// Do not put lifecycle Draft or UI labels such as "Approval Pending" here.
    /// </summary>
    public static readonly string[] PendingApprovalStatusNames = ["Pending"];

    /// <summary>Older QuizApprovalStatus row names that still mean Pending (40) when reading.</summary>
    public static readonly string[] PendingApprovalLegacyNames = ["Under Review"];

    /// <summary>
    /// Staff UI labels only (not lookup rows). Same stored status as Pending (40) after submit.
    /// </summary>
    public static readonly string[] PendingApprovalDisplayLabels = ["Approval Pending", "Pending Approval"];

    /// <summary>Names used to find Pending rows in the database (canonical + legacy, not UI labels).</summary>
    public static string[] PendingApprovalStatusReadNames
        => [..PendingApprovalStatusNames, ..PendingApprovalLegacyNames];
    public static readonly string[] SchoolApprovedStatusNames = ["SchoolApproved", "School Approved"];
    /// <summary>Initial editable lifecycle (DB may still say "Not Assigned" until initializer renames).</summary>
    public static readonly string[] DraftLifecycleNames = ["Draft", "Not Assigned", "DRAFT"];
    public static readonly string[] PublishedLifecycleNames = ["Published", "PUBLISHED"];
    public static readonly string[] AssignedLifecycleNames = ["Assigned", "ASSIGNED"];
    public static readonly string[] ArchivedLifecycleNames = ["Archived", "ARCHIVED"];
    public static readonly string[] ApprovedStatusNames = ["Approved", "APPROVED"];
    /// <summary>Canonical reject status name for writes.</summary>
    public static readonly string[] RejectedApprovalStatusNames = ["Rejected", "REJECTED"];
    /// <summary>Legacy deny labels still recognized when reading older rows.</summary>
    public static readonly string[] RejectedApprovalAliasNames =
        ["Rejected", "Declined", "Cancelled", "REJECTED"];

    public static bool IsPendingApprovalName(string? name)
        => MatchesAnyName(name, PendingApprovalStatusNames)
           || MatchesAnyName(name, PendingApprovalLegacyNames)
           || MatchesAnyName(name, PendingApprovalDisplayLabels);

    public static bool IsSchoolApprovedName(string? name)
        => MatchesAnyName(name, SchoolApprovedStatusNames);

    public static bool IsFinalApprovedName(string? name)
        => MatchesAnyName(name, ApprovedStatusNames);

    public static bool IsRejectedApprovalName(string? name)
        => MatchesAnyName(name, RejectedApprovalAliasNames);

    /// <summary>True when the row is awaiting first-tier or portal review (canonical id 40 or pending aliases).</summary>
    public static bool IsPendingApproval(short approvalStatusId, string? name)
        => approvalStatusId == QuizApprovalStatusIds.Pending || IsPendingApprovalName(name);

    /// <summary>True when school/campus has endorsed (canonical id 41 or aliases).</summary>
    public static bool IsSchoolApproved(short approvalStatusId, string? name)
        => approvalStatusId == QuizApprovalStatusIds.SchoolApproved || IsSchoolApprovedName(name);

    /// <summary>True when portal has given final approval (canonical id 42 or aliases).</summary>
    public static bool IsFinalApproved(short approvalStatusId, string? name)
        => approvalStatusId == QuizApprovalStatusIds.Approved || IsFinalApprovedName(name);

    /// <summary>True when lifecycle is unpublished Draft (including legacy "Not Assigned").</summary>
    public static bool IsDraftLifecycleName(string? name)
        => MatchesAnyName(name, DraftLifecycleNames);

    /// <summary>
    /// Submitted unpublished quiz that is not SchoolApproved, Approved, or Rejected.
    /// Covers UI "Approval Pending" even when the stored lookup name is mismatched.
    /// </summary>
    public static bool IsSubmittedDraftAwaitingReview(
        short approvalStatusId,
        string? approvalName,
        string? lifecycleName,
        bool hasSubmittedForReview)
    {
        if (!hasSubmittedForReview || !IsDraftLifecycleName(lifecycleName))
        {
            return false;
        }

        if (IsRejectedApprovalName(approvalName)
            || IsFinalApproved(approvalStatusId, approvalName)
            || IsSchoolApproved(approvalStatusId, approvalName))
        {
            return false;
        }

        return true;
    }

    private static bool MatchesAnyName(string? name, IReadOnlyList<string> names)
    {
        var trimmed = name?.Trim();
        return !string.IsNullOrWhiteSpace(trimmed)
               && names.Any(candidate => candidate.Equals(trimmed, StringComparison.OrdinalIgnoreCase));
    }
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

    /// <summary>Legacy alias -- single-choice style MCQ names.</summary>
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
