using RankUpEducation.Contracts.Teachers;
using RankUpEducation.Domain.Students;
using RankUpEducation.Domain.Teachers;

namespace RankUpEducation.Application.Teachers;

public interface ITeacherRepository
{
    Task ReplaceClassSectionsAsync(
        long teacherId,
        IReadOnlyList<TeacherClassSectionItem> classSections,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<TeacherClassSectionItem>> GetClassSectionsAsync(
        long teacherId,
        CancellationToken cancellationToken);

    Task<IReadOnlyDictionary<long, IReadOnlyList<TeacherClassSectionItem>>> GetClassSectionsByTeacherIdsAsync(
        IReadOnlyList<long> teacherIds,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<TeacherRosterStudentResponse>> GetRosterStudentsAsync(
        long teacherId,
        int schoolId,
        int campusId,
        CancellationToken cancellationToken);

    Task<bool> IsStudentInRosterAsync(
        long teacherId,
        long studentId,
        int schoolId,
        int campusId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<StudentGroup>> ListGroupsAsync(
        long teacherId,
        CancellationToken cancellationToken);

    Task<StudentGroup?> GetGroupAsync(
        long groupId,
        long teacherId,
        CancellationToken cancellationToken);

    Task AddGroupAsync(StudentGroup group, CancellationToken cancellationToken);

    Task AddGroupMemberAsync(StudentGroupMember member, CancellationToken cancellationToken);

    Task RemoveGroupMemberAsync(
        long groupId,
        long studentId,
        CancellationToken cancellationToken);

    Task<bool> IsGroupMemberAsync(
        long groupId,
        long studentId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<TeacherGroupMemberResponse>> GetGroupMembersAsync(
        long groupId,
        CancellationToken cancellationToken);

    Task<IReadOnlyDictionary<long, int>> CountRosterStudentsByTeacherIdsAsync(
        IReadOnlyList<long> teacherIds,
        CancellationToken cancellationToken);

    Task<IReadOnlyDictionary<long, IReadOnlyList<string>>> GetTeacherNamesByStudentRosterAsync(
        IReadOnlyList<long> studentIds,
        CancellationToken cancellationToken);
}
