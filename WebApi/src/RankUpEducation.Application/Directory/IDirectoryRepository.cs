using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Contracts.Directory;
using RankUpEducation.Domain.Parents;
using RankUpEducation.Domain.Students;
using RankUpEducation.Domain.Teachers;

namespace RankUpEducation.Application.Directory;

public interface IDirectoryRepository
{
    Task<IReadOnlyList<SchoolResponse>> ListSchoolsAsync(CancellationToken cancellationToken);

    Task<SchoolResponse?> GetSchoolAsync(long schoolId, CancellationToken cancellationToken);

    Task<SchoolResponse> CreateSchoolAsync(string name, string code, bool isActive, CancellationToken cancellationToken);

    Task<SchoolResponse?> UpdateSchoolAsync(
        long schoolId,
        string name,
        string code,
        bool isActive,
        CancellationToken cancellationToken);

    Task<bool> SetSchoolActiveAsync(long schoolId, bool isActive, CancellationToken cancellationToken);

    Task<IReadOnlyList<CampusResponse>> ListCampusesAsync(long schoolId, CancellationToken cancellationToken);

    Task<CampusResponse?> GetCampusAsync(long campusId, CancellationToken cancellationToken);

    Task<CampusResponse> CreateCampusAsync(
        long schoolId,
        string name,
        string address,
        bool isActive,
        CancellationToken cancellationToken);

    Task<CampusResponse?> UpdateCampusAsync(
        long campusId,
        string name,
        string address,
        bool isActive,
        CancellationToken cancellationToken);

    Task<bool> SetCampusActiveAsync(long campusId, bool isActive, CancellationToken cancellationToken);

    Task<bool> SchoolExistsAsync(long schoolId, CancellationToken cancellationToken);

    Task<(IReadOnlyList<DirectoryStudentResponse> Items, int TotalCount)> ListStudentsAsync(
        int? schoolId,
        int? campusId,
        short? grade,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);

    Task<(IReadOnlyList<DirectoryTeacherResponse> Items, int TotalCount)> ListTeachersAsync(
        int? schoolId,
        int? campusId,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);

    Task<(IReadOnlyList<DirectoryParentResponse> Items, int TotalCount)> ListParentsAsync(
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken);

    Task<Student?> GetStudentEntityAsync(long studentId, CancellationToken cancellationToken);

    Task<Teacher?> GetTeacherEntityAsync(long teacherId, CancellationToken cancellationToken);

    Task<Parent?> GetParentEntityAsync(long parentId, CancellationToken cancellationToken);

    Task SetUserActiveAsync(long userId, bool isActive, CancellationToken cancellationToken);

    Task LinkParentStudentAsync(
        long parentId,
        long studentId,
        string relationship,
        CancellationToken cancellationToken);

    Task UnlinkParentStudentAsync(long parentId, long studentId, CancellationToken cancellationToken);

    Task<bool> ParentExistsAsync(long parentId, CancellationToken cancellationToken);

    Task<bool> StudentExistsAsync(long studentId, CancellationToken cancellationToken);

    Task<int> CountParentStudentLinksAsync(long parentId, CancellationToken cancellationToken);
}
