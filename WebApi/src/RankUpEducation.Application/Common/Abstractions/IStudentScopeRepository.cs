using RankUpEducation.Application.Quizzes;

namespace RankUpEducation.Application.Common.Abstractions;

public interface IStudentScopeRepository
{
    Task<IReadOnlyList<long>> GetLinkedStudentIdsAsync(long parentId, CancellationToken cancellationToken);

    Task<IReadOnlyList<LinkedStudentInfo>> GetLinkedStudentsAsync(long parentId, CancellationToken cancellationToken);

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

    Task<IReadOnlyList<long>> GetGroupMemberStudentIdsAsync(
        long groupId,
        long ownerUserId,
        string creatorRole,
        CancellationToken cancellationToken);
}
