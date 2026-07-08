using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Contracts.Directory;

namespace RankUpEducation.Application.Directory;

public interface IDirectoryRepository
{
    Task<IReadOnlyList<SchoolResponse>> ListSchoolsAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<CampusResponse>> ListCampusesAsync(long schoolId, CancellationToken cancellationToken);

    Task<IReadOnlyList<DirectoryStudentResponse>> ListStudentsAsync(
        int? schoolId,
        int? campusId,
        short? grade,
        string? search,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<DirectoryTeacherResponse>> ListTeachersAsync(
        int? schoolId,
        int? campusId,
        string? search,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<DirectoryParentResponse>> ListParentsAsync(
        string? search,
        CancellationToken cancellationToken);

    Task LinkParentStudentAsync(
        long parentId,
        long studentId,
        string relationship,
        CancellationToken cancellationToken);

    Task UnlinkParentStudentAsync(long parentId, long studentId, CancellationToken cancellationToken);

    Task<bool> ParentExistsAsync(long parentId, CancellationToken cancellationToken);

    Task<bool> StudentExistsAsync(long studentId, CancellationToken cancellationToken);
}
