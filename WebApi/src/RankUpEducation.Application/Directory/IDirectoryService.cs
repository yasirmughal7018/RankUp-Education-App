using RankUpEducation.Contracts.Directory;

namespace RankUpEducation.Application.Directory;

/// <summary>Application service for school directory management, scoped by admin role.</summary>
public interface IDirectoryService
{
    /// <summary>Returns dashboard counts and visible directory sections for the current admin.</summary>
    Task<DirectorySummaryResponse> GetSummaryAsync(CancellationToken cancellationToken);

    /// <summary>Lists schools visible to the current administrator.</summary>
    Task<SchoolListResponse> ListSchoolsAsync(CancellationToken cancellationToken);

    /// <summary>Creates a school when the caller may manage schools.</summary>
    Task<SchoolResponse> CreateSchoolAsync(UpsertSchoolRequest request, CancellationToken cancellationToken);

    /// <summary>Updates a school when the caller may manage it.</summary>
    Task<SchoolResponse> UpdateSchoolAsync(
        long schoolId,
        UpsertSchoolRequest request,
        CancellationToken cancellationToken);

    /// <summary>Deactivates a school without deleting it.</summary>
    Task DeactivateSchoolAsync(long schoolId, CancellationToken cancellationToken);

    /// <summary>Reactivates a previously deactivated school.</summary>
    Task ActivateSchoolAsync(long schoolId, CancellationToken cancellationToken);

    /// <summary>Lists campuses for a school visible to the caller.</summary>
    Task<CampusListResponse> ListCampusesAsync(long schoolId, CancellationToken cancellationToken);

    /// <summary>Creates a campus under an accessible school.</summary>
    Task<CampusResponse> CreateCampusAsync(
        long schoolId,
        UpsertCampusRequest request,
        CancellationToken cancellationToken);

    /// <summary>Updates campus details when the caller may manage campuses.</summary>
    Task<CampusResponse> UpdateCampusAsync(
        long campusId,
        UpsertCampusRequest request,
        CancellationToken cancellationToken);

    /// <summary>Deactivates a campus.</summary>
    Task DeactivateCampusAsync(long campusId, CancellationToken cancellationToken);

    /// <summary>Reactivates a campus.</summary>
    Task ActivateCampusAsync(long campusId, CancellationToken cancellationToken);

    /// <summary>Lists active schools for registration and public pickers.</summary>
    Task<SchoolListResponse> ListPublicSchoolsAsync(CancellationToken cancellationToken);

    /// <summary>Lists active campuses for an active school.</summary>
    Task<CampusListResponse> ListPublicCampusesAsync(long schoolId, CancellationToken cancellationToken);

    /// <summary>Page of students filtered by the caller's directory scope.</summary>
    Task<DirectoryStudentListResponse> ListStudentsAsync(
        int? schoolId,
        int? campusId,
        short? grade,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);

    /// <summary>Provisions a student account and profile in the caller's scope.</summary>
    Task<DirectoryStudentResponse> CreateStudentAsync(
        CreateDirectoryStudentRequest request,
        CancellationToken cancellationToken);

    /// <summary>Updates student profile and campus assignment.</summary>
    Task<DirectoryStudentResponse> UpdateStudentAsync(
        long studentId,
        UpdateDirectoryStudentRequest request,
        CancellationToken cancellationToken);

    /// <summary>Activates a student user account.</summary>
    Task ActivateStudentAsync(long studentId, CancellationToken cancellationToken);

    /// <summary>Deactivates a student user account.</summary>
    Task DeactivateStudentAsync(long studentId, CancellationToken cancellationToken);

    /// <summary>Deactivates many students, skipping ids outside the caller's scope.</summary>
    Task<BulkActionResponse> BulkDeactivateStudentsAsync(
        BulkDeactivateRequest request,
        CancellationToken cancellationToken);

    /// <summary>Page of teachers filtered by the caller's directory scope.</summary>
    Task<DirectoryTeacherListResponse> ListTeachersAsync(
        int? schoolId,
        int? campusId,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);

    /// <summary>Provisions a teacher account or adds the teacher role to an existing user.</summary>
    Task<DirectoryTeacherResponse> CreateTeacherAsync(
        CreateDirectoryTeacherRequest request,
        CancellationToken cancellationToken);

    /// <summary>Updates teacher profile and campus assignment.</summary>
    Task<DirectoryTeacherResponse> UpdateTeacherAsync(
        long teacherId,
        UpdateDirectoryTeacherRequest request,
        CancellationToken cancellationToken);

    /// <summary>Activates a teacher user account.</summary>
    Task ActivateTeacherAsync(long teacherId, CancellationToken cancellationToken);

    /// <summary>Deactivates a teacher user account.</summary>
    Task DeactivateTeacherAsync(long teacherId, CancellationToken cancellationToken);

    /// <summary>Deactivates many teachers, skipping ids outside the caller's scope.</summary>
    Task<BulkActionResponse> BulkDeactivateTeachersAsync(
        BulkDeactivateRequest request,
        CancellationToken cancellationToken);

    /// <summary>Page of parents with optional search filter.</summary>
    Task<DirectoryParentListResponse> ListParentsAsync(
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);

    /// <summary>Provisions a parent account or adds the parent role to an existing user.</summary>
    Task<DirectoryParentResponse> CreateParentAsync(
        CreateDirectoryParentRequest request,
        CancellationToken cancellationToken);

    /// <summary>Updates parent contact and profile fields.</summary>
    Task<DirectoryParentResponse> UpdateParentAsync(
        long parentId,
        UpdateDirectoryParentRequest request,
        CancellationToken cancellationToken);

    /// <summary>Activates a parent user account.</summary>
    Task ActivateParentAsync(long parentId, CancellationToken cancellationToken);

    /// <summary>Deactivates a parent user account.</summary>
    Task DeactivateParentAsync(long parentId, CancellationToken cancellationToken);

    /// <summary>Deactivates many parents by id.</summary>
    Task<BulkActionResponse> BulkDeactivateParentsAsync(
        BulkDeactivateRequest request,
        CancellationToken cancellationToken);

    /// <summary>Links a parent to a student within the caller's school scope.</summary>
    Task<LinkParentStudentResponse> LinkParentStudentAsync(
        long parentId,
        LinkParentStudentRequest request,
        CancellationToken cancellationToken);

    /// <summary>Removes a parent-student link.</summary>
    Task UnlinkParentStudentAsync(long parentId, long studentId, CancellationToken cancellationToken);

    /// <summary>Page of school admins (portal admin only).</summary>
    Task<DirectorySchoolAdminListResponse> ListSchoolAdminsAsync(
        int? schoolId,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);

    /// <summary>Provisions a school admin for the given school.</summary>
    Task<DirectorySchoolAdminResponse> CreateSchoolAdminAsync(
        CreateDirectorySchoolAdminRequest request,
        CancellationToken cancellationToken);

    /// <summary>Updates school admin profile and school assignment.</summary>
    Task<DirectorySchoolAdminResponse> UpdateSchoolAdminAsync(
        long userId,
        UpdateDirectorySchoolAdminRequest request,
        CancellationToken cancellationToken);

    /// <summary>Activates a school admin account.</summary>
    Task ActivateSchoolAdminAsync(long userId, CancellationToken cancellationToken);

    /// <summary>Deactivates a school admin account.</summary>
    Task DeactivateSchoolAdminAsync(long userId, CancellationToken cancellationToken);

    /// <summary>Page of campus admins visible to portal or school admins.</summary>
    Task<DirectoryCampusAdminListResponse> ListCampusAdminsAsync(
        int? schoolId,
        int? campusId,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);

    /// <summary>Provisions a campus admin for the given school and campus.</summary>
    Task<DirectoryCampusAdminResponse> CreateCampusAdminAsync(
        CreateDirectoryCampusAdminRequest request,
        CancellationToken cancellationToken);

    /// <summary>Updates campus admin profile and campus assignment.</summary>
    Task<DirectoryCampusAdminResponse> UpdateCampusAdminAsync(
        long userId,
        UpdateDirectoryCampusAdminRequest request,
        CancellationToken cancellationToken);

    /// <summary>Activates a campus admin account.</summary>
    Task ActivateCampusAdminAsync(long userId, CancellationToken cancellationToken);

    /// <summary>Deactivates a campus admin account.</summary>
    Task DeactivateCampusAdminAsync(long userId, CancellationToken cancellationToken);
}
