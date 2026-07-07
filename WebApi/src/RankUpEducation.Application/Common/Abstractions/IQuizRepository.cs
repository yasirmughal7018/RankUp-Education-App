using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Questions;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Common.Abstractions;

public interface IQuizRepository
{
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

    Task<IReadOnlyList<QuizListItem>> ListForSchoolAsync(
        int? schoolId,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken);

    Task<QuizDetailItem?> GetDetailForStudentAsync(long quizId, long studentId, CancellationToken cancellationToken);

    Task<QuizAssignmentAccess?> GetAssignmentAccessAsync(
        long quizId,
        long studentId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizQuestionItem>> GetQuizQuestionsAsync(long quizId, CancellationToken cancellationToken);

    Task AddAttemptAsync(QuizAttempt attempt, CancellationToken cancellationToken);

    Task AddAttemptQuestionsAsync(IReadOnlyList<QuizAttemptQuestion> attemptQuestions, CancellationToken cancellationToken);

    Task AddAttemptAnswersAsync(IReadOnlyList<QuizAttemptAnswer> answers, CancellationToken cancellationToken);

    Task<QuizAttemptDetailItem?> GetAttemptDetailAsync(long attemptId, long studentId, CancellationToken cancellationToken);

    Task<QuizAttempt?> GetAttemptEntityAsync(long attemptId, long studentId, CancellationToken cancellationToken);

    Task<IReadOnlyList<long>> GetLinkedStudentIdsAsync(long parentId, CancellationToken cancellationToken);

    Task<short> ResolveLookupIdAsync(string type, string name, short fallback, CancellationToken cancellationToken);

    Task<string> GetLookupNameAsync(short id, CancellationToken cancellationToken);

    Task<int> CountAttemptsAsync(long quizId, long studentId, CancellationToken cancellationToken);

    Task<short> ResolveLookupIdByNamesAsync(
        string type,
        IReadOnlyList<string> names,
        short fallback,
        CancellationToken cancellationToken);

    Task AddQuizAsync(Quiz quiz, CancellationToken cancellationToken);

    Task AddQuestionAsync(Question question, CancellationToken cancellationToken);

    Task AddQuestionOptionsAsync(IReadOnlyList<QuestionOption> options, CancellationToken cancellationToken);

    Task AddQuizQuestionAsync(QuizQuestion quizQuestion, CancellationToken cancellationToken);

    Task<Quiz?> GetQuizEntityAsync(long quizId, CancellationToken cancellationToken);

    Task<Question?> GetQuestionEntityAsync(long questionId, CancellationToken cancellationToken);

    Task<QuizQuestion?> GetQuizQuestionLinkAsync(long quizId, long questionId, CancellationToken cancellationToken);

    Task RemoveQuizQuestionLinkAsync(QuizQuestion link, CancellationToken cancellationToken);

    Task RemoveQuestionOptionsAsync(long questionId, CancellationToken cancellationToken);

    Task RecalculateQuizTotalsAsync(long quizId, CancellationToken cancellationToken);

    Task<bool> HasStartedAssignmentsAsync(long quizId, DateTimeOffset now, CancellationToken cancellationToken);

    Task<bool> HasAnyAssignmentsAsync(long quizId, CancellationToken cancellationToken);

    Task<bool> HasAnyAttemptsAsync(long quizId, CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizListItem>> ListForCreatorAsync(
        long creatorUserId,
        string? search,
        string? subject,
        string? grade,
        CancellationToken cancellationToken);

    Task<QuizDetailItem?> GetDetailForCreatorAsync(long quizId, long creatorUserId, CancellationToken cancellationToken);

    Task<StudentSchoolContext?> GetStudentSchoolContextAsync(long studentId, CancellationToken cancellationToken);

    Task<bool> IsLinkedStudentAsync(long parentId, long studentId, CancellationToken cancellationToken);

    Task<bool> IsStudentInSchoolAsync(
        long studentId,
        int schoolId,
        int campusId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<long>> GetStudentIdsInSchoolByGradeAsync(
        int schoolId,
        int campusId,
        short gradeId,
        CancellationToken cancellationToken);

    Task<bool> IsParentPrivateQuizTypeAsync(short quizTypeId, CancellationToken cancellationToken);

    Task<IReadOnlyList<long>> GetGroupMemberStudentIdsAsync(
        long groupId,
        long ownerUserId,
        string creatorRole,
        CancellationToken cancellationToken);

    Task AddAssignmentsAsync(IReadOnlyList<QuizAssignment> assignments, CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizAssignmentListItem>> ListAssignmentsForQuizAsync(
        long quizId,
        CancellationToken cancellationToken);

    Task<int> RemoveFutureAssignmentsAsync(long quizId, DateTimeOffset now, CancellationToken cancellationToken);

    Task<bool> AssignmentExistsAsync(long quizId, long studentId, CancellationToken cancellationToken);

    Task DeleteQuizAsync(Quiz quiz, CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizAssignmentBoardItem>> ListAssignmentBoardForCreatorAsync(
        long creatorUserId,
        long? studentId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizMonitoringStudentItem>> ListMonitoringForQuizAsync(
        long quizId,
        long creatorUserId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<PendingReviewItem>> ListPendingReviewsForCreatorAsync(
        long creatorUserId,
        CancellationToken cancellationToken);

    Task<AttemptReviewDetailItem?> GetAttemptReviewDetailAsync(
        long quizId,
        long attemptId,
        CancellationToken cancellationToken);

    Task<QuizAttempt?> GetAttemptEntityByIdAsync(long attemptId, long quizId, CancellationToken cancellationToken);

    Task<QuizAssignment?> GetAssignmentEntityAsync(long quizId, long studentId, CancellationToken cancellationToken);

    Task<QuizAssignmentReviewState?> GetAssignmentReviewStateAsync(
        long quizId,
        long studentId,
        CancellationToken cancellationToken);

    Task<QuizAttemptQuestion?> GetAttemptQuestionEntityAsync(
        long attemptId,
        long questionId,
        CancellationToken cancellationToken);

    Task<QuizAttemptAnswer?> GetAttemptAnswerEntityAsync(long attemptQuestionId, CancellationToken cancellationToken);

    Task<QuizReview?> GetQuestionReviewEntityAsync(long reviewId, CancellationToken cancellationToken);

    Task AddReviewAsync(QuizReview review, CancellationToken cancellationToken);

    Task<bool> IsSubmittedAttemptAsync(long attemptId, CancellationToken cancellationToken);

    Task<IReadOnlyList<QuizQuestionCopyItem>> GetQuizQuestionsForCopyAsync(
        long quizId,
        CancellationToken cancellationToken);

    Task<QuizAssignment?> GetAssignmentEntityByIdAsync(
        long assignmentId,
        long quizId,
        CancellationToken cancellationToken);
}
