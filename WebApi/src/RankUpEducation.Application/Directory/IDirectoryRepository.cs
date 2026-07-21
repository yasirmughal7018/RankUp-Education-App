using RankUpEducation.Contracts.Directory;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Parents;
using RankUpEducation.Domain.Students;
using RankUpEducation.Domain.Teachers;

namespace RankUpEducation.Application.Directory;

/// <summary>Data access for schools, campuses, and directory user listings.</summary>
public interface IDirectoryRepository
{
    /// <summary>Lists non-deleted schools with campus counts.</summary>
    Task<IReadOnlyList<SchoolResponse>> ListSchoolsAsync(CancellationToken cancellationToken);

    /// <summary>Loads a single school by id, or null when missing or deleted.</summary>
    Task<SchoolResponse?> GetSchoolAsync(long schoolId, CancellationToken cancellationToken);

    /// <summary>Creates a school and persists it immediately.</summary>
    Task<SchoolResponse> CreateSchoolAsync(string name, string code, bool isActive, CancellationToken cancellationToken);

    /// <summary>Updates school fields, or null when not found.</summary>
    Task<SchoolResponse?> UpdateSchoolAsync(
        long schoolId,
        string name,
        string code,
        bool isActive,
        CancellationToken cancellationToken);

    /// <summary>Sets school active flag, returning false when not found.</summary>
    Task<bool> SetSchoolActiveAsync(long schoolId, bool isActive, CancellationToken cancellationToken);

    /// <summary>Lists campuses for a school.</summary>
    Task<IReadOnlyList<CampusResponse>> ListCampusesAsync(long schoolId, CancellationToken cancellationToken);

    /// <summary>Loads a campus by id, or null when missing.</summary>
    Task<CampusResponse?> GetCampusAsync(long campusId, CancellationToken cancellationToken);

    /// <summary>Creates a campus under the given school.</summary>
    Task<CampusResponse> CreateCampusAsync(
        long schoolId,
        string name,
        string address,
        bool isActive,
        CancellationToken cancellationToken);

    /// <summary>Updates campus fields, or null when not found.</summary>
    Task<CampusResponse?> UpdateCampusAsync(
        long campusId,
        string name,
        string address,
        bool isActive,
        CancellationToken cancellationToken);

    /// <summary>Sets campus active flag, returning false when not found.</summary>
    Task<bool> SetCampusActiveAsync(long campusId, bool isActive, CancellationToken cancellationToken);

    /// <summary>Returns whether a non-deleted school exists.</summary>
    Task<bool> SchoolExistsAsync(long schoolId, CancellationToken cancellationToken);

    /// <summary>Page of students with optional school, campus, grade, and search filters.</summary>
    Task<(IReadOnlyList<DirectoryStudentResponse> Items, int TotalCount)> ListStudentsAsync(
        int? schoolId,
        int? campusId,
        short? grade,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);

    /// <summary>Page of teachers with optional school, campus, and search filters.</summary>
    Task<(IReadOnlyList<DirectoryTeacherResponse> Items, int TotalCount)> ListTeachersAsync(
        int? schoolId,
        int? campusId,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);

    /// <summary>Page of parents with optional search filter.</summary>
    Task<(IReadOnlyList<DirectoryParentResponse> Items, int TotalCount)> ListParentsAsync(
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);

    /// <summary>Loads the student profile entity for updates and activation checks.</summary>
    Task<Student?> GetStudentEntityAsync(long studentId, CancellationToken cancellationToken);

    /// <summary>Loads the teacher profile entity for updates and activation checks.</summary>
    Task<Teacher?> GetTeacherEntityAsync(long teacherId, CancellationToken cancellationToken);

    /// <summary>Loads the parent profile entity for updates and activation checks.</summary>
    Task<Parent?> GetParentEntityAsync(long parentId, CancellationToken cancellationToken);

    /// <summary>Sets the underlying user active flag for a directory member.</summary>
    Task SetUserActiveAsync(long userId, bool isActive, CancellationToken cancellationToken);

    /// <summary>Creates a parent-student link with the given relationship label.</summary>
    Task LinkParentStudentAsync(
        long parentId,
        long studentId,
        string relationship,
        CancellationToken cancellationToken);

    /// <summary>Removes a parent-student link when present.</summary>
    Task UnlinkParentStudentAsync(long parentId, long studentId, CancellationToken cancellationToken);

    /// <summary>Returns whether a parent profile exists.</summary>
    Task<bool> ParentExistsAsync(long parentId, CancellationToken cancellationToken);

    /// <summary>Returns whether a student profile exists.</summary>
    Task<bool> StudentExistsAsync(long studentId, CancellationToken cancellationToken);

    /// <summary>Counts active parent-student links for display on parent rows.</summary>
    Task<int> CountParentStudentLinksAsync(long parentId, CancellationToken cancellationToken);

    /// <summary>Page of school admins with optional school and search filters.</summary>
    Task<(IReadOnlyList<DirectorySchoolAdminResponse> Items, int TotalCount)> ListSchoolAdminsAsync(
        int? schoolId,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);

    /// <summary>Page of campus admins with optional school, campus, and search filters.</summary>
    Task<(IReadOnlyList<DirectoryCampusAdminResponse> Items, int TotalCount)> ListCampusAdminsAsync(
        int? schoolId,
        int? campusId,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);

    /// <summary>Counts schools by active/inactive for the directory summary dashboard.</summary>
    Task<DirectorySchoolStatusCounts> CountSchoolsByStatusAsync(
        int? schoolId,
        CancellationToken cancellationToken);

    /// <summary>Counts users in a role by account-status buckets for the directory summary.</summary>
    Task<DirectoryStatusCounts> CountUsersByStatusAsync(
        UserRole role,
        int? schoolId,
        int? campusId,
        CancellationToken cancellationToken);
}
