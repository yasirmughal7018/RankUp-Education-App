namespace RankUpEducation.Application.Quizzes;

public static class QuizLookupNames
{
    public const string QuizType = "QuizType";
    public const string QuizLifecycleStatus = "QuizLifecycleStatus";
    public const string QuizApprovalStatus = "QuizApprovalStatus";
    public const string QuizResultStatus = "QuizResultStatus";
    public const string QuestionType = "QuestionType";
    public const string QuestionStatus = "QuestionStatus";

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
    public static readonly string[] DraftLifecycleNames = ["Draft", "DRAFT"];
    public static readonly string[] PublishedLifecycleNames = ["Published", "PUBLISHED"];
    public static readonly string[] AssignedLifecycleNames = ["Assigned", "ASSIGNED"];
    public static readonly string[] CancelledLifecycleNames = ["Cancelled", "CANCELLED"];
    public static readonly string[] ArchivedLifecycleNames = ["Archived", "ARCHIVED"];
    public static readonly string[] ApprovedStatusNames = ["Approved", "APPROVED"];
    public static readonly string[] RejectedApprovalStatusNames = ["Rejected", "Declined", "REJECTED"];
    public static readonly string[] AssignedResultNames = ["Assigned", "Not Started", "Pending"];

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
    public static readonly string[] SubmittedAttemptStatusNames = ["Submitted", "SUBMITTED"];
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
