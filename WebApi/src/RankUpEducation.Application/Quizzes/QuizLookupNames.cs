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
    public static readonly string[] AssignedResultNames = ["Assigned", "Not Started", "Pending"];
    public static readonly string[] McqQuestionTypeNames = ["MCQ", "Multiple Choice", "MultipleChoice"];
    public static readonly string[] DescriptiveQuestionTypeNames = ["Descriptive", "Short Answer", "ShortAnswer"];
    public static readonly string[] ActiveQuestionStatusNames = ["Active", "Approved", "Published"];
    public static readonly string[] SubmittedAttemptStatusNames = ["Submitted", "SUBMITTED"];
    public static readonly string[] ReviewedAttemptStatusNames = ["Reviewed", "REVIEWED"];
    public static readonly string[] CompletedResultNames = ["Completed", "Reviewed"];
}
