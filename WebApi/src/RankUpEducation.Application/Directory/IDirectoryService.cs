using RankUpEducation.Contracts.Directory;

namespace RankUpEducation.Application.Directory;

public interface IDirectoryService
{
    Task<SchoolListResponse> ListSchoolsAsync(CancellationToken cancellationToken);

    Task<SchoolResponse> CreateSchoolAsync(UpsertSchoolRequest request, CancellationToken cancellationToken);

    Task<SchoolResponse> UpdateSchoolAsync(
        long schoolId,
        UpsertSchoolRequest request,
        CancellationToken cancellationToken);

    Task DeactivateSchoolAsync(long schoolId, CancellationToken cancellationToken);

    Task ActivateSchoolAsync(long schoolId, CancellationToken cancellationToken);

    Task<CampusListResponse> ListCampusesAsync(long schoolId, CancellationToken cancellationToken);

    Task<CampusResponse> CreateCampusAsync(
        long schoolId,
        UpsertCampusRequest request,
        CancellationToken cancellationToken);

    Task<CampusResponse> UpdateCampusAsync(
        long campusId,
        UpsertCampusRequest request,
        CancellationToken cancellationToken);

    Task DeactivateCampusAsync(long campusId, CancellationToken cancellationToken);

    Task ActivateCampusAsync(long campusId, CancellationToken cancellationToken);

    Task<SchoolListResponse> ListPublicSchoolsAsync(CancellationToken cancellationToken);

    Task<CampusListResponse> ListPublicCampusesAsync(long schoolId, CancellationToken cancellationToken);

    Task<DirectoryStudentListResponse> ListStudentsAsync(
        int? schoolId,
        int? campusId,
        short? grade,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);

    Task<DirectoryStudentResponse> CreateStudentAsync(
        CreateDirectoryStudentRequest request,
        CancellationToken cancellationToken);

    Task<DirectoryStudentResponse> UpdateStudentAsync(
        long studentId,
        UpdateDirectoryStudentRequest request,
        CancellationToken cancellationToken);

    Task ActivateStudentAsync(long studentId, CancellationToken cancellationToken);

    Task DeactivateStudentAsync(long studentId, CancellationToken cancellationToken);

    Task<BulkActionResponse> BulkDeactivateStudentsAsync(
        BulkDeactivateRequest request,
        CancellationToken cancellationToken);

    Task<DirectoryTeacherListResponse> ListTeachersAsync(
        int? schoolId,
        int? campusId,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);

    Task<DirectoryTeacherResponse> CreateTeacherAsync(
        CreateDirectoryTeacherRequest request,
        CancellationToken cancellationToken);

    Task<DirectoryTeacherResponse> UpdateTeacherAsync(
        long teacherId,
        UpdateDirectoryTeacherRequest request,
        CancellationToken cancellationToken);

    Task ActivateTeacherAsync(long teacherId, CancellationToken cancellationToken);

    Task DeactivateTeacherAsync(long teacherId, CancellationToken cancellationToken);

    Task<BulkActionResponse> BulkDeactivateTeachersAsync(
        BulkDeactivateRequest request,
        CancellationToken cancellationToken);

    Task<DirectoryParentListResponse> ListParentsAsync(
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);

    Task<DirectoryParentResponse> CreateParentAsync(
        CreateDirectoryParentRequest request,
        CancellationToken cancellationToken);

    Task<DirectoryParentResponse> UpdateParentAsync(
        long parentId,
        UpdateDirectoryParentRequest request,
        CancellationToken cancellationToken);

    Task ActivateParentAsync(long parentId, CancellationToken cancellationToken);

    Task DeactivateParentAsync(long parentId, CancellationToken cancellationToken);

    Task<BulkActionResponse> BulkDeactivateParentsAsync(
        BulkDeactivateRequest request,
        CancellationToken cancellationToken);

    Task<LinkParentStudentResponse> LinkParentStudentAsync(
        long parentId,
        LinkParentStudentRequest request,
        CancellationToken cancellationToken);

    Task UnlinkParentStudentAsync(long parentId, long studentId, CancellationToken cancellationToken);

    Task<DirectorySchoolAdminListResponse> ListSchoolAdminsAsync(
        int? schoolId,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);

    Task<DirectorySchoolAdminResponse> CreateSchoolAdminAsync(
        CreateDirectorySchoolAdminRequest request,
        CancellationToken cancellationToken);

    Task<DirectorySchoolAdminResponse> UpdateSchoolAdminAsync(
        long userId,
        UpdateDirectorySchoolAdminRequest request,
        CancellationToken cancellationToken);

    Task ActivateSchoolAdminAsync(long userId, CancellationToken cancellationToken);

    Task DeactivateSchoolAdminAsync(long userId, CancellationToken cancellationToken);

    Task<DirectoryCampusAdminListResponse> ListCampusAdminsAsync(
        int? schoolId,
        int? campusId,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);

    Task<DirectoryCampusAdminResponse> CreateCampusAdminAsync(
        CreateDirectoryCampusAdminRequest request,
        CancellationToken cancellationToken);

    Task<DirectoryCampusAdminResponse> UpdateCampusAdminAsync(
        long userId,
        UpdateDirectoryCampusAdminRequest request,
        CancellationToken cancellationToken);

    Task ActivateCampusAdminAsync(long userId, CancellationToken cancellationToken);

    Task DeactivateCampusAdminAsync(long userId, CancellationToken cancellationToken);
}
