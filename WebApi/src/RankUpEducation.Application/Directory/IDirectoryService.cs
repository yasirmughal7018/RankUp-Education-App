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

    Task<DirectoryStudentListResponse> ListStudentsAsync(
        int? schoolId,
        int? campusId,
        short? grade,
        string? search,
        CancellationToken cancellationToken);

    Task<DirectoryTeacherListResponse> ListTeachersAsync(
        int? schoolId,
        int? campusId,
        string? search,
        CancellationToken cancellationToken);

    Task<DirectoryParentListResponse> ListParentsAsync(
        string? search,
        CancellationToken cancellationToken);

    Task<LinkParentStudentResponse> LinkParentStudentAsync(
        long parentId,
        LinkParentStudentRequest request,
        CancellationToken cancellationToken);

    Task UnlinkParentStudentAsync(long parentId, long studentId, CancellationToken cancellationToken);
}
