using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>Resolves student visibility for parents, teachers, and reporting.</summary>
public interface IStudentScopeRepository
{
    /// <summary>Returns student ids linked to the parent profile.</summary>
    Task<IReadOnlyList<long>> GetLinkedStudentIdsAsync(long parentId, CancellationToken cancellationToken);

    /// <summary>Returns linked students with display fields for parent dashboards.</summary>
    Task<IReadOnlyList<LinkedStudentInfo>> GetLinkedStudentsAsync(long parentId, CancellationToken cancellationToken);

    /// <summary>Returns the school and campus context for a student, if any.</summary>
    Task<StudentSchoolContext?> GetStudentSchoolContextAsync(long studentId, CancellationToken cancellationToken);

    /// <summary>Returns class placement with school/campus names for the student self-view.</summary>
    Task<StudentMeClassInfo?> GetStudentMeClassAsync(long studentId, CancellationToken cancellationToken);

    /// <summary>Returns parent user ids linked to the student (active links only).</summary>
    Task<IReadOnlyList<long>> GetLinkedParentIdsAsync(long studentId, CancellationToken cancellationToken);

    /// <summary>Returns whether the student is linked to the given parent.</summary>
    Task<bool> IsLinkedStudentAsync(long parentId, long studentId, CancellationToken cancellationToken);

    /// <summary>Returns whether the student belongs to the given school campus.</summary>
    Task<bool> IsStudentInSchoolAsync(
        long studentId,
        int schoolId,
        int campusId,
        CancellationToken cancellationToken);

    /// <summary>Returns active student ids in a campus matching the given grade lookup id.</summary>
    Task<IReadOnlyList<long>> GetStudentIdsInSchoolByGradeAsync(
        int schoolId,
        int campusId,
        short gradeId,
        CancellationToken cancellationToken);

    /// <summary>Returns active student ids in a campus matching grade and section.</summary>
    Task<IReadOnlyList<long>> GetStudentIdsInCampusByGradeAndSectionAsync(
        int schoolId,
        int campusId,
        short gradeId,
        string section,
        CancellationToken cancellationToken);

    /// <summary>Returns active student ids across all campuses in a school.</summary>
    /// <summary>Returns active student ids in a school, optionally narrowed by campus and/or grade.</summary>
    Task<IReadOnlyList<long>> GetStudentIdsInSchoolAsync(
        int schoolId,
        CancellationToken cancellationToken,
        int? campusId = null,
        short? gradeId = null);

    /// <summary>Returns active student ids across the given schools (PortalAdmin multi-school).</summary>
    Task<IReadOnlyList<long>> GetStudentIdsInSchoolsAsync(
        IReadOnlyList<int> schoolIds,
        CancellationToken cancellationToken);

    /// <summary>Returns student ids in a group when the caller owns or may access that group.</summary>
    Task<IReadOnlyList<long>> GetGroupMemberStudentIdsAsync(
        long groupId,
        long ownerUserId,
        UserRole creatorRole,
        CancellationToken cancellationToken);

    /// <summary>Student ids in the teacher's assigned class/section combinations at their campus.</summary>
    Task<IReadOnlyList<long>> GetTeacherRosterStudentIdsAsync(
        long teacherId,
        int schoolId,
        int campusId,
        CancellationToken cancellationToken);

    /// <summary>True when the student is on the teacher's class/section roster.</summary>
    Task<bool> IsStudentInTeacherRosterAsync(
        long teacherId,
        long studentId,
        int schoolId,
        int campusId,
        CancellationToken cancellationToken);
}
