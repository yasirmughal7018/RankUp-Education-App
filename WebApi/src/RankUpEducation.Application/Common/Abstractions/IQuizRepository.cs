using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Approvals;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Common.Abstractions;

public interface IQuizRepository
{
    Task AddQuizAsync(Quiz quiz, CancellationToken cancellationToken);

    Task<Quiz?> GetQuizEntityAsync(long quizId, CancellationToken cancellationToken);

    Task DeleteQuizAsync(Quiz quiz, CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizListItem>> ListForStudentAsync(
        long studentId,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizListItem>> ListForLinkedStudentsAsync(
        IReadOnlyList<long> studentIds,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizListItem>> ListForTeacherAsync(
        long teacherUserId,
        int schoolId,
        int campusId,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken);

    /// <summary>
    /// School/campus/portal catalog. When <paramref name="includeAllDrafts"/> is true (PortalAdmin),
    /// other authors' Draft quizzes are included only if they are in the approval pipeline
    /// (submitted Pending, SchoolApproved, Approved, Rejected). Unsubmitted WIP stays owner-only.
    /// When <paramref name="includePublishedFromAllSchools"/> is true, Published/Assigned/Archived
    /// school-type quizzes are visible regardless of school or creator.
    /// When <paramref name="includeInScopeSubmittedDrafts"/> is true, submitted Teacher/Coordinator
    /// pipeline drafts in the given school/campus are included so SchoolAdmin/CampusAdmin can review.
    /// </summary>
    Task<IReadOnlyList<QuizListItem>> ListForSchoolAsync(
        int? schoolId,
        int? campusId,
        long? viewerUserId,
        bool includeAllDrafts,
        bool includeAllSchools,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken,
        bool includePublishedFromAllSchools = false,
        bool includeInScopeSubmittedDrafts = false);

    Task<IReadOnlyList<PendingQuizApprovalItem>> ListPendingApprovalAsync(
        int? schoolId,
        int? campusId,
        bool includeSchoolApproved,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizListItem>> ListForCreatorAsync(
        long creatorUserId,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken);

    Task<QuizDetailItem?> GetDetailForStudentAsync(long quizId, long studentId, CancellationToken cancellationToken);

    Task<QuizDetailItem?> GetDetailForCreatorAsync(long quizId, long creatorUserId, CancellationToken cancellationToken);

    /// <summary>Manage detail by quiz id (ownership already checked by the service).</summary>
    Task<QuizDetailItem?> GetDetailForManageAsync(long quizId, CancellationToken cancellationToken);

    /// <summary>Appends one workflow event to the quiz's app_approval trail.</summary>
    Task AddApprovalEventAsync(Approval approval, CancellationToken cancellationToken);

    Task<bool> HasStartedAssignmentsAsync(long quizId, DateTimeOffset now, CancellationToken cancellationToken);

    Task<bool> HasAnyAssignmentsAsync(long quizId, CancellationToken cancellationToken);

    Task<bool> HasAnyAttemptsAsync(long quizId, CancellationToken cancellationToken);

    Task<bool> HasSubmittedForReviewAsync(long quizId, CancellationToken cancellationToken);
}
