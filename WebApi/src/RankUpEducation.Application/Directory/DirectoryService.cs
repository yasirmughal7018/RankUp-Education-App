using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Contracts.Directory;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Directory;

public sealed class DirectoryService : IDirectoryService
{
    private readonly IDirectoryRepository _directory;
    private readonly ICurrentUserService _currentUser;
    private readonly IUnitOfWork _unitOfWork;

    public DirectoryService(
        IDirectoryRepository directory,
        ICurrentUserService currentUser,
        IUnitOfWork unitOfWork)
    {
        _directory = directory;
        _currentUser = currentUser;
        _unitOfWork = unitOfWork;
    }

    public async Task<SchoolListResponse> ListSchoolsAsync(CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var items = await _directory.ListSchoolsAsync(cancellationToken);
        if (IsSchoolAdmin())
        {
            items = items.Where(school => school.Id == _currentUser.SchoolId).ToArray();
        }

        return new SchoolListResponse(items);
    }

    public async Task<SchoolResponse> CreateSchoolAsync(
        UpsertSchoolRequest request,
        CancellationToken cancellationToken)
    {
        EnsureSuperAdmin();
        ValidateSchoolRequest(request);
        var school = await _directory.CreateSchoolAsync(
            request.Name,
            request.Code,
            request.IsActive,
            cancellationToken);
        return school;
    }

    public async Task<SchoolResponse> UpdateSchoolAsync(
        long schoolId,
        UpsertSchoolRequest request,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();
        EnsureSchoolAccess(schoolId);
        ValidateSchoolRequest(request);
        var school = await _directory.UpdateSchoolAsync(
            schoolId,
            request.Name,
            request.Code,
            request.IsActive,
            cancellationToken)
            ?? throw new NotFoundAppException("School was not found.");
        return school;
    }

    public async Task DeactivateSchoolAsync(long schoolId, CancellationToken cancellationToken)
    {
        EnsureAdmin();
        EnsureSchoolAccess(schoolId);
        if (!await _directory.SetSchoolActiveAsync(schoolId, false, cancellationToken))
        {
            throw new NotFoundAppException("School was not found.");
        }
    }

    public async Task ActivateSchoolAsync(long schoolId, CancellationToken cancellationToken)
    {
        EnsureAdmin();
        EnsureSchoolAccess(schoolId);
        if (!await _directory.SetSchoolActiveAsync(schoolId, true, cancellationToken))
        {
            throw new NotFoundAppException("School was not found.");
        }
    }

    public async Task<CampusListResponse> ListCampusesAsync(long schoolId, CancellationToken cancellationToken)
    {
        EnsureAdmin();
        EnsureSchoolAccess(schoolId);
        var items = await _directory.ListCampusesAsync(schoolId, cancellationToken);
        return new CampusListResponse(items);
    }

    public async Task<CampusResponse> CreateCampusAsync(
        long schoolId,
        UpsertCampusRequest request,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();
        EnsureSchoolAccess(schoolId);
        ValidateCampusRequest(request);

        if (!await _directory.SchoolExistsAsync(schoolId, cancellationToken))
        {
            throw new NotFoundAppException("School was not found.");
        }

        return await _directory.CreateCampusAsync(
            schoolId,
            request.Name,
            request.Address ?? string.Empty,
            request.IsActive,
            cancellationToken);
    }

    public async Task<CampusResponse> UpdateCampusAsync(
        long campusId,
        UpsertCampusRequest request,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();
        ValidateCampusRequest(request);

        var existing = await _directory.GetCampusAsync(campusId, cancellationToken)
            ?? throw new NotFoundAppException("Campus was not found.");
        EnsureSchoolAccess(existing.SchoolId);

        return await _directory.UpdateCampusAsync(
            campusId,
            request.Name,
            request.Address ?? string.Empty,
            request.IsActive,
            cancellationToken)
            ?? throw new NotFoundAppException("Campus was not found.");
    }

    public async Task DeactivateCampusAsync(long campusId, CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var existing = await _directory.GetCampusAsync(campusId, cancellationToken)
            ?? throw new NotFoundAppException("Campus was not found.");
        EnsureSchoolAccess(existing.SchoolId);

        if (!await _directory.SetCampusActiveAsync(campusId, false, cancellationToken))
        {
            throw new NotFoundAppException("Campus was not found.");
        }
    }

    public async Task ActivateCampusAsync(long campusId, CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var existing = await _directory.GetCampusAsync(campusId, cancellationToken)
            ?? throw new NotFoundAppException("Campus was not found.");
        EnsureSchoolAccess(existing.SchoolId);

        if (!await _directory.SetCampusActiveAsync(campusId, true, cancellationToken))
        {
            throw new NotFoundAppException("Campus was not found.");
        }
    }

    public async Task<DirectoryStudentListResponse> ListStudentsAsync(
        int? schoolId,
        int? campusId,
        short? grade,
        string? search,
        CancellationToken cancellationToken)
    {
        EnsureDirectoryReader();
        var (resolvedSchoolId, resolvedCampusId) = ResolveSchoolCampusFilter(schoolId, campusId);
        var items = await _directory.ListStudentsAsync(
            resolvedSchoolId,
            resolvedCampusId,
            grade,
            search,
            cancellationToken);
        return new DirectoryStudentListResponse(items);
    }

    public async Task<DirectoryTeacherListResponse> ListTeachersAsync(
        int? schoolId,
        int? campusId,
        string? search,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var (resolvedSchoolId, resolvedCampusId) = ResolveSchoolCampusFilter(schoolId, campusId);
        var items = await _directory.ListTeachersAsync(
            resolvedSchoolId,
            resolvedCampusId,
            search,
            cancellationToken);
        return new DirectoryTeacherListResponse(items);
    }

    public async Task<DirectoryParentListResponse> ListParentsAsync(
        string? search,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var items = await _directory.ListParentsAsync(search, cancellationToken);
        return new DirectoryParentListResponse(items);
    }

    public async Task<LinkParentStudentResponse> LinkParentStudentAsync(
        long parentId,
        LinkParentStudentRequest request,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();

        if (!await _directory.ParentExistsAsync(parentId, cancellationToken))
        {
            throw new NotFoundAppException("Parent was not found.");
        }

        if (!await _directory.StudentExistsAsync(request.StudentId, cancellationToken))
        {
            throw new NotFoundAppException("Student was not found.");
        }

        var relationship = string.IsNullOrWhiteSpace(request.Relationship)
            ? "Guardian"
            : request.Relationship.Trim();

        await _directory.LinkParentStudentAsync(parentId, request.StudentId, relationship, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new LinkParentStudentResponse(parentId, request.StudentId, relationship, true);
    }

    public async Task UnlinkParentStudentAsync(long parentId, long studentId, CancellationToken cancellationToken)
    {
        EnsureAdmin();
        await _directory.UnlinkParentStudentAsync(parentId, studentId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private void EnsureAdmin()
    {
        var role = ParseRole();
        if (role is not (UserRole.SuperAdmin or UserRole.SchoolAdmin))
        {
            throw new ForbiddenAppException("Only administrators can manage the directory.");
        }
    }

    private void EnsureSuperAdmin()
    {
        if (ParseRole() != UserRole.SuperAdmin)
        {
            throw new ForbiddenAppException("Only SuperAdmin can create schools.");
        }
    }

    private static void ValidateSchoolRequest(UpsertSchoolRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Code))
        {
            throw new ValidationAppException(["School name and code are required."]);
        }
    }

    private static void ValidateCampusRequest(UpsertCampusRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ValidationAppException(["Campus name is required."]);
        }
    }

    private void EnsureDirectoryReader()
    {
        var role = ParseRole();
        if (role is not (UserRole.SuperAdmin or UserRole.SchoolAdmin or UserRole.Teacher))
        {
            throw new ForbiddenAppException("You do not have access to the student directory.");
        }
    }

    private bool IsSchoolAdmin()
        => ParseRole() == UserRole.SchoolAdmin;

    private void EnsureSchoolAccess(long schoolId)
    {
        if (IsSchoolAdmin() && _currentUser.SchoolId != schoolId)
        {
            throw new ForbiddenAppException("You can only access campuses in your school.");
        }
    }

    private (int? SchoolId, int? CampusId) ResolveSchoolCampusFilter(int? schoolId, int? campusId)
    {
        var role = ParseRole();
        if (role is UserRole.SchoolAdmin or UserRole.Teacher)
        {
            var scopedSchoolId = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
            var scopedCampusId = campusId ?? _currentUser.CampusId;
            return (scopedSchoolId, scopedCampusId);
        }

        return (schoolId, campusId);
    }

    private UserRole ParseRole()
    {
        if (string.IsNullOrWhiteSpace(_currentUser.Role))
        {
            throw new AuthenticationAppException("Authentication is required.");
        }

        return Enum.Parse<UserRole>(_currentUser.Role, ignoreCase: true);
    }
}
