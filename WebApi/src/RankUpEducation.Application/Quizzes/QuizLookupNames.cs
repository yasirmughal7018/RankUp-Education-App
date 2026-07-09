namespace RankUpEducation.Application.Quizzes;

public static class QuizLookupNames
{
    public const string QuizType = "QuizType";
    public const string QuizLifecycleStatus = "QuizLifecycleStatus";
    public const string QuizApprovalStatus = "QuizApprovalStatus";
    public const string QuizResultStatus = "QuizResultStatus";
    public const string QuestionType = "QuestionType";
    public const string QuestionStatus = "QuestionStatus";

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

    public static readonly string[] PendingQuestionStatusNames = ["Pending", "Draft", "Under Review"];
    public static readonly string[] ApprovedQuestionStatusNames = ["Approved", "Active", "Published"];
    public static readonly string[] RejectedQuestionStatusNames = ["Rejected", "Declined"];
    public static readonly string[] ActiveQuestionStatusNames = ["Active", "Approved", "Published"];
    public static readonly string[] SubmittedAttemptStatusNames = ["Submitted", "SUBMITTED"];
    public static readonly string[] ReviewedAttemptStatusNames = ["Reviewed", "REVIEWED"];
    public static readonly string[] CompletedResultNames = ["Completed", "Reviewed"];
}
