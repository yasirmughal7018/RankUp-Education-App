using RankUpEducation.Contracts.Directory;

namespace RankUpEducation.Application.Directory;

public interface IDirectoryService
{
    Task<SchoolListResponse> ListSchoolsAsync(CancellationToken cancellationToken);

    Task<CampusListResponse> ListCampusesAsync(long schoolId, CancellationToken cancellationToken);

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
