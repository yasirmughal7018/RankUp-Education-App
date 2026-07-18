using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Contracts.Directory;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Parents;
using RankUpEducation.Domain.Students;
using RankUpEducation.Domain.Teachers;

namespace RankUpEducation.Application.Directory;

public sealed class DirectoryService : IDirectoryService
{
    private readonly IDirectoryRepository _directory;
    private readonly IUserRepository _users;
    private readonly ICurrentUserService _currentUser;
    private readonly IUnitOfWork _unitOfWork;

    public DirectoryService(
        IDirectoryRepository directory,
        IUserRepository users,
        ICurrentUserService currentUser,
        IUnitOfWork unitOfWork)
    {
        _directory = directory;
        _users = users;
        _currentUser = currentUser;
        _unitOfWork = unitOfWork;
    }

    public async Task<DirectorySummaryResponse> GetSummaryAsync(CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var role = ParseRole();

        // SchoolAdmin: whole school. CampusAdmin: school + campus. PortalAdmin: no filter.
        int? schoolId = null;
        int? campusId = null;
        if (role == UserRole.CampusAdmin)
        {
            schoolId = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
            campusId = _currentUser.CampusId
                ?? throw new ForbiddenAppException("Campus context was not found.");
        }
        else if (role == UserRole.SchoolAdmin)
        {
            schoolId = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
        }

        var schools = await _directory.CountSchoolsByStatusAsync(schoolId, cancellationToken);
        var students = await _directory.CountUsersByStatusAsync(
            UserRole.Student,
            schoolId,
            campusId,
            cancellationToken);
        var teachers = await _directory.CountUsersByStatusAsync(
            UserRole.Teacher,
            schoolId,
            campusId,
            cancellationToken);

        // Parents are not school/campus scoped in directory list today — keep the same scope.
        var parents = await _directory.CountUsersByStatusAsync(
            UserRole.Parent,
            schoolId: null,
            campusId: null,
            cancellationToken);

        var visibleSections = new List<string>
        {
            "schools",
            "students",
            "parents",
            "teachers",
            "schoolChanges",
        };

        var schoolAdmins = new DirectoryStatusCounts(0, 0, 0, 0, 0, 0, 0, 0);
        var campusAdmins = new DirectoryStatusCounts(0, 0, 0, 0, 0, 0, 0, 0);

        if (role == UserRole.PortalAdmin)
        {
            schoolAdmins = await _directory.CountUsersByStatusAsync(
                UserRole.SchoolAdmin,
                schoolId: null,
                campusId: null,
                cancellationToken);
            visibleSections.Add("schoolAdmins");
        }

        if (role is UserRole.PortalAdmin or UserRole.SchoolAdmin)
        {
            campusAdmins = await _directory.CountUsersByStatusAsync(
                UserRole.CampusAdmin,
                schoolId,
                campusId: null,
                cancellationToken);
            visibleSections.Add("campusAdmins");
        }

        return new DirectorySummaryResponse(
            schools,
            students,
            parents,
            teachers,
            schoolAdmins,
            campusAdmins,
            visibleSections);
    }

    public async Task<SchoolListResponse> ListSchoolsAsync(CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var items = await _directory.ListSchoolsAsync(cancellationToken);
        if (IsSchoolAdmin() || IsCampusAdmin())
        {
            items = items.Where(school => school.Id == _currentUser.SchoolId).ToArray();
        }

        return new SchoolListResponse(items);
    }

    public async Task<SchoolResponse> CreateSchoolAsync(
        UpsertSchoolRequest request,
        CancellationToken cancellationToken)
    {
        EnsureSchoolManager();
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
        EnsureSchoolManager();
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
        EnsureSchoolManager();
        EnsureSchoolAccess(schoolId);
        if (!await _directory.SetSchoolActiveAsync(schoolId, false, cancellationToken))
        {
            throw new NotFoundAppException("School was not found.");
        }
    }

    public async Task ActivateSchoolAsync(long schoolId, CancellationToken cancellationToken)
    {
        EnsureSchoolManager();
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
        if (IsCampusAdmin())
        {
            items = items.Where(campus => campus.Id == _currentUser.CampusId).ToArray();
        }

        return new CampusListResponse(items);
    }

    public async Task<SchoolListResponse> ListPublicSchoolsAsync(CancellationToken cancellationToken)
    {
        var items = await _directory.ListSchoolsAsync(cancellationToken);
        return new SchoolListResponse(items.Where(school => school.IsActive).ToArray());
    }

    public async Task<CampusListResponse> ListPublicCampusesAsync(long schoolId, CancellationToken cancellationToken)
    {
        var school = await _directory.GetSchoolAsync(schoolId, cancellationToken)
            ?? throw new NotFoundAppException("School was not found.");

        if (!school.IsActive)
        {
            throw new NotFoundAppException("School was not found.");
        }

        var items = await _directory.ListCampusesAsync(schoolId, cancellationToken);
        return new CampusListResponse(items.Where(campus => campus.IsActive).ToArray());
    }

    public async Task<CampusResponse> CreateCampusAsync(
        long schoolId,
        UpsertCampusRequest request,
        CancellationToken cancellationToken)
    {
        EnsureSchoolManager();
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
        EnsureSchoolManager();
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
        EnsureSchoolManager();
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
        EnsureSchoolManager();
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
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        EnsureDirectoryReader();
        var (safePageNumber, safePageSize) = NormalizePaging(pageNumber, pageSize);
        var (resolvedSchoolId, resolvedCampusId) = ResolveSchoolCampusFilter(schoolId, campusId);
        var (items, totalCount) = await _directory.ListStudentsAsync(
            resolvedSchoolId,
            resolvedCampusId,
            grade,
            search,
            safePageNumber,
            safePageSize,
            cancellationToken);
        return new DirectoryStudentListResponse(items, safePageNumber, safePageSize, totalCount);
    }

    public async Task<DirectoryStudentResponse> CreateStudentAsync(
        CreateDirectoryStudentRequest request,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();
        ValidateCreateStudentRequest(request);

        var (schoolId, campusId) = ResolveCreateSchoolCampus(request.SchoolId, request.CampusId);
        await EnsureCampusBelongsToSchoolAsync(schoolId, campusId, cancellationToken);

        var username = request.Username.AsTrimmedString();
        if (await _users.UsernameExistsAsync(username, cancellationToken))
        {
            throw new ValidationAppException(["Username is already taken."]);
        }

        var mobileNumber = request.MobileNumber.AsTrimmedOrNull();
        if (mobileNumber is not null && await _users.MobileNumberExistsAsync(mobileNumber, cancellationToken))
        {
            throw new ValidationAppException(["An account already exists for this mobile number."]);
        }

        // Auto-approved; user sets password on first login.
        var user = User.CreateProvisionedAccount(
            username,
            request.FullName.AsTrimmedString(),
            UserRole.Student,
            schoolId,
            campusId,
            mobileNumber);
        user.SetRollNumberTeacherCode(request.RollNumber.AsTrimmedString());
        await _users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var section = request.Section.AsTrimmedOrDefault("A");
        await _users.AddStudentProfileAsync(
            new Student(user.Id, request.Grade, section, mobileNumber),
            cancellationToken);
        user.AttachProfileContext(user.Id, schoolId, campusId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new DirectoryStudentResponse(
            user.Id,
            user.FullName,
            user.Username,
            request.RollNumber.AsTrimmedString(),
            request.Grade,
            section,
            schoolId,
            campusId,
            user.IsActive);
    }

    public async Task<DirectoryStudentResponse> UpdateStudentAsync(
        long studentId,
        UpdateDirectoryStudentRequest request,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();
        ValidateUpdateStudentRequest(request);

        var student = await _directory.GetStudentEntityAsync(studentId, cancellationToken)
            ?? throw new NotFoundAppException("Student was not found.");

        var user = await _users.GetByIdAsync(studentId, cancellationToken)
            ?? throw new NotFoundAppException("Student was not found.");
        EnsureSchoolAccess(user.SchoolId);
        EnsureCampusAccess(user.CampusId);

        var campus = await _directory.GetCampusAsync(request.CampusId, cancellationToken)
            ?? throw new NotFoundAppException("Campus was not found.");
        if (user.SchoolId is null || campus.SchoolId != user.SchoolId)
        {
            throw new ValidationAppException(["Campus must belong to the student's school."]);
        }

        user.UpdateProfile(request.FullName);
        user.AssignSchoolCampus(user.SchoolId, request.CampusId);
        user.SetRollNumberTeacherCode(request.RollNumber);
        student.Update(request.Grade, request.Section, request.MobileNumber);
        user.AttachProfileContext(user.Id, user.SchoolId, request.CampusId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new DirectoryStudentResponse(
            student.Id,
            user.FullName,
            user.Username,
            user.RollNumberTeacherCode ?? string.Empty,
            student.Grade,
            student.Section,
            user.SchoolId ?? 0,
            user.CampusId ?? 0,
            user.IsActive);
    }

    public async Task ActivateStudentAsync(long studentId, CancellationToken cancellationToken)
    {
        await SetStudentActiveAsync(studentId, true, cancellationToken);
    }

    public async Task DeactivateStudentAsync(long studentId, CancellationToken cancellationToken)
    {
        await SetStudentActiveAsync(studentId, false, cancellationToken);
    }

    public async Task<BulkActionResponse> BulkDeactivateStudentsAsync(
        BulkDeactivateRequest request,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var ids = NormalizeIds(request);
        var affected = 0;
        foreach (var studentId in ids)
        {
            var student = await _directory.GetStudentEntityAsync(studentId, cancellationToken);
            if (student is null)
            {
                continue;
            }

            var user = await _users.GetByIdAsync(studentId, cancellationToken);
            if (IsSchoolAdmin() && (user is null || _currentUser.SchoolId != user.SchoolId))
            {
                continue;
            }

            await _directory.SetUserActiveAsync(studentId, false, cancellationToken);
            affected++;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return new BulkActionResponse(affected);
    }

    public async Task<DirectoryTeacherListResponse> ListTeachersAsync(
        int? schoolId,
        int? campusId,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var (safePageNumber, safePageSize) = NormalizePaging(pageNumber, pageSize);
        var (resolvedSchoolId, resolvedCampusId) = ResolveSchoolCampusFilter(schoolId, campusId);
        var (items, totalCount) = await _directory.ListTeachersAsync(
            resolvedSchoolId,
            resolvedCampusId,
            search,
            safePageNumber,
            safePageSize,
            cancellationToken);
        return new DirectoryTeacherListResponse(items, safePageNumber, safePageSize, totalCount);
    }

    public async Task<DirectoryTeacherResponse> CreateTeacherAsync(
        CreateDirectoryTeacherRequest request,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();
        ValidateCreateTeacherRequest(request);

        var (schoolId, campusId) = ResolveCreateSchoolCampus(request.SchoolId, request.CampusId);
        await EnsureCampusBelongsToSchoolAsync(schoolId, campusId, cancellationToken);

        var mobileNumber = request.MobileNumber.AsTrimmedOrNull();
        var existing = await FindExistingUserForAdditionalRoleAsync(mobileNumber, cnic: null, cancellationToken);
        if (existing is not null)
        {
            return await AddTeacherRoleToExistingUserAsync(
                existing,
                request,
                schoolId,
                campusId,
                mobileNumber,
                cancellationToken);
        }

        var username = request.Username.AsTrimmedString();
        if (await _users.UsernameExistsAsync(username, cancellationToken))
        {
            throw new ValidationAppException(["Username is already taken."]);
        }

        // Auto-approved; user sets password on first login.
        var user = User.CreateProvisionedAccount(
            username,
            request.FullName.AsTrimmedString(),
            UserRole.Teacher,
            schoolId,
            campusId,
            mobileNumber);
        user.SetRollNumberTeacherCode(request.TeacherCode.AsTrimmedString());
        await _users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _users.AddTeacherProfileAsync(
            new Teacher(user.Id, mobileNumber),
            cancellationToken);
        user.AttachProfileContext(user.Id, schoolId, campusId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new DirectoryTeacherResponse(
            user.Id,
            user.FullName,
            user.Username,
            request.TeacherCode.AsTrimmedString(),
            schoolId,
            campusId,
            user.IsActive);
    }

    public async Task<DirectoryTeacherResponse> UpdateTeacherAsync(
        long teacherId,
        UpdateDirectoryTeacherRequest request,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();
        ValidateUpdateTeacherRequest(request);

        var teacher = await _directory.GetTeacherEntityAsync(teacherId, cancellationToken)
            ?? throw new NotFoundAppException("Teacher was not found.");

        var user = await _users.GetByIdAsync(teacherId, cancellationToken)
            ?? throw new NotFoundAppException("Teacher was not found.");
        EnsureSchoolAccess(user.SchoolId);
        EnsureCampusAccess(user.CampusId);

        var campus = await _directory.GetCampusAsync(request.CampusId, cancellationToken)
            ?? throw new NotFoundAppException("Campus was not found.");
        if (user.SchoolId is null || campus.SchoolId != user.SchoolId)
        {
            throw new ValidationAppException(["Campus must belong to the teacher's school."]);
        }

        user.UpdateProfile(request.FullName);
        user.AssignSchoolCampus(user.SchoolId, request.CampusId);
        user.SetRollNumberTeacherCode(request.TeacherCode);
        teacher.Update(request.MobileNumber);
        user.AttachProfileContext(user.Id, user.SchoolId, request.CampusId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new DirectoryTeacherResponse(
            teacher.Id,
            user.FullName,
            user.Username,
            user.RollNumberTeacherCode ?? string.Empty,
            user.SchoolId ?? 0,
            user.CampusId ?? 0,
            user.IsActive);
    }

    public async Task ActivateTeacherAsync(long teacherId, CancellationToken cancellationToken)
    {
        await SetTeacherActiveAsync(teacherId, true, cancellationToken);
    }

    public async Task DeactivateTeacherAsync(long teacherId, CancellationToken cancellationToken)
    {
        await SetTeacherActiveAsync(teacherId, false, cancellationToken);
    }

    public async Task<BulkActionResponse> BulkDeactivateTeachersAsync(
        BulkDeactivateRequest request,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var ids = NormalizeIds(request);
        var affected = 0;
        foreach (var teacherId in ids)
        {
            var teacher = await _directory.GetTeacherEntityAsync(teacherId, cancellationToken);
            if (teacher is null)
            {
                continue;
            }

            var user = await _users.GetByIdAsync(teacherId, cancellationToken);
            if (IsSchoolAdmin() && (user is null || _currentUser.SchoolId != user.SchoolId))
            {
                continue;
            }

            await _directory.SetUserActiveAsync(teacherId, false, cancellationToken);
            affected++;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return new BulkActionResponse(affected);
    }

    public async Task<DirectoryParentListResponse> ListParentsAsync(
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var (safePageNumber, safePageSize) = NormalizePaging(pageNumber, pageSize);
        var (items, totalCount) = await _directory.ListParentsAsync(
            search,
            safePageNumber,
            safePageSize,
            cancellationToken);
        return new DirectoryParentListResponse(items, safePageNumber, safePageSize, totalCount);
    }

    public async Task<DirectoryParentResponse> CreateParentAsync(
        CreateDirectoryParentRequest request,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();
        ValidateCreateParentRequest(request);

        var mobileNumber = request.MobileNumber.AsTrimmedOrNull();
        var cnic = request.Cnic.AsTrimmedOrNull();
        var existing = await FindExistingUserForAdditionalRoleAsync(mobileNumber, cnic, cancellationToken);
        if (existing is not null)
        {
            return await AddParentRoleToExistingUserAsync(existing, request, mobileNumber, cnic, cancellationToken);
        }

        var username = request.Username.AsTrimmedString();
        if (await _users.UsernameExistsAsync(username, cancellationToken))
        {
            throw new ValidationAppException(["Username is already taken."]);
        }

        // Auto-approved; user sets password on first login.
        var user = User.CreateProvisionedAccount(
            username,
            request.FullName.AsTrimmedString(),
            UserRole.Parent,
            mobileNumber: mobileNumber,
            cnic: cnic);
        await _users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _users.AddParentProfileAsync(new Parent(user.Id, mobileNumber), cancellationToken);
        user.AttachProfileContext(user.Id, null, null);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new DirectoryParentResponse(user.Id, user.FullName, user.Username, 0, user.IsActive);
    }

    public async Task<DirectoryParentResponse> UpdateParentAsync(
        long parentId,
        UpdateDirectoryParentRequest request,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();
        ValidateUpdateParentRequest(request);

        var parent = await _directory.GetParentEntityAsync(parentId, cancellationToken)
            ?? throw new NotFoundAppException("Parent was not found.");

        var user = await _users.GetByIdAsync(parentId, cancellationToken)
            ?? throw new NotFoundAppException("Parent was not found.");

        user.UpdateProfile(request.FullName);
        user.UpdateContactInfo(request.MobileNumber, request.Cnic);
        parent.Update(request.MobileNumber);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var linkedCount = await _directory.CountParentStudentLinksAsync(parentId, cancellationToken);
        return new DirectoryParentResponse(
            parent.Id,
            user.FullName,
            user.Username,
            linkedCount,
            user.IsActive);
    }

    public async Task ActivateParentAsync(long parentId, CancellationToken cancellationToken)
    {
        await SetParentActiveAsync(parentId, true, cancellationToken);
    }

    public async Task DeactivateParentAsync(long parentId, CancellationToken cancellationToken)
    {
        await SetParentActiveAsync(parentId, false, cancellationToken);
    }

    public async Task<BulkActionResponse> BulkDeactivateParentsAsync(
        BulkDeactivateRequest request,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var ids = NormalizeIds(request);
        var affected = 0;
        foreach (var parentId in ids)
        {
            if (!await _directory.ParentExistsAsync(parentId, cancellationToken))
            {
                continue;
            }

            await _directory.SetUserActiveAsync(parentId, false, cancellationToken);
            affected++;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return new BulkActionResponse(affected);
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

        var student = await _directory.GetStudentEntityAsync(request.StudentId, cancellationToken)
            ?? throw new NotFoundAppException("Student was not found.");
        var studentUser = await _users.GetByIdAsync(request.StudentId, cancellationToken)
            ?? throw new NotFoundAppException("Student was not found.");
        EnsureSchoolAccess(studentUser.SchoolId);

        var relationship = request.Relationship.AsTrimmedOrDefault("Guardian");

        await _directory.LinkParentStudentAsync(parentId, request.StudentId, relationship, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new LinkParentStudentResponse(parentId, request.StudentId, relationship, true);
    }

    public async Task UnlinkParentStudentAsync(long parentId, long studentId, CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var student = await _directory.GetStudentEntityAsync(studentId, cancellationToken);
        if (student is not null)
        {
            var studentUser = await _users.GetByIdAsync(studentId, cancellationToken);
            EnsureSchoolAccess(studentUser?.SchoolId);
        }

        await _directory.UnlinkParentStudentAsync(parentId, studentId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task SetStudentActiveAsync(long studentId, bool isActive, CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var student = await _directory.GetStudentEntityAsync(studentId, cancellationToken)
            ?? throw new NotFoundAppException("Student was not found.");
        var user = await _users.GetByIdAsync(studentId, cancellationToken)
            ?? throw new NotFoundAppException("Student was not found.");
        EnsureSchoolAccess(user.SchoolId);
        EnsureCampusAccess(user.CampusId);
        await _directory.SetUserActiveAsync(studentId, isActive, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task SetTeacherActiveAsync(long teacherId, bool isActive, CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var teacher = await _directory.GetTeacherEntityAsync(teacherId, cancellationToken)
            ?? throw new NotFoundAppException("Teacher was not found.");
        var user = await _users.GetByIdAsync(teacherId, cancellationToken)
            ?? throw new NotFoundAppException("Teacher was not found.");
        EnsureSchoolAccess(user.SchoolId);
        EnsureCampusAccess(user.CampusId);
        await _directory.SetUserActiveAsync(teacherId, isActive, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task SetParentActiveAsync(long parentId, bool isActive, CancellationToken cancellationToken)
    {
        EnsureAdmin();
        if (!await _directory.ParentExistsAsync(parentId, cancellationToken))
        {
            throw new NotFoundAppException("Parent was not found.");
        }

        await _directory.SetUserActiveAsync(parentId, isActive, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureCampusBelongsToSchoolAsync(int schoolId, int campusId, CancellationToken cancellationToken)
    {
        if (!await _directory.SchoolExistsAsync(schoolId, cancellationToken))
        {
            throw new NotFoundAppException("School was not found.");
        }

        var campus = await _directory.GetCampusAsync(campusId, cancellationToken)
            ?? throw new NotFoundAppException("Campus was not found.");
        if (campus.SchoolId != schoolId)
        {
            throw new ValidationAppException(["Campus must belong to the selected school."]);
        }
    }

    private (int SchoolId, int CampusId) ResolveCreateSchoolCampus(int requestSchoolId, int requestCampusId)
    {
        if (IsCampusAdmin())
        {
            var scopedSchoolId = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
            var scopedCampusId = _currentUser.CampusId
                ?? throw new ForbiddenAppException("Campus context was not found.");
            if (requestSchoolId != scopedSchoolId || requestCampusId != scopedCampusId)
            {
                throw new ForbiddenAppException("You can only create users in your campus.");
            }

            return (scopedSchoolId, scopedCampusId);
        }

        if (IsSchoolAdmin())
        {
            var scopedSchoolId = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
            if (requestSchoolId != scopedSchoolId)
            {
                throw new ForbiddenAppException("You can only create users in your school.");
            }

            return (scopedSchoolId, requestCampusId);
        }

        return (requestSchoolId, requestCampusId);
    }

    private static (int PageNumber, int PageSize) NormalizePaging(int pageNumber, int pageSize)
    {
        var safePageNumber = pageNumber < 1 ? 1 : pageNumber;
        var safePageSize = Math.Clamp(pageSize, 1, 100);
        return (safePageNumber, safePageSize);
    }

    public async Task<DirectorySchoolAdminListResponse> ListSchoolAdminsAsync(
        int? schoolId,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        EnsurePortalAdmin();
        var (safePageNumber, safePageSize) = NormalizePaging(pageNumber, pageSize);
        var (items, totalCount) = await _directory.ListSchoolAdminsAsync(
            schoolId,
            search,
            safePageNumber,
            safePageSize,
            cancellationToken);
        return new DirectorySchoolAdminListResponse(items, safePageNumber, safePageSize, totalCount);
    }

    public async Task<DirectorySchoolAdminResponse> CreateSchoolAdminAsync(
        CreateDirectorySchoolAdminRequest request,
        CancellationToken cancellationToken)
    {
        EnsurePortalAdmin();
        ValidateCreateSchoolAdminRequest(request);

        if (!await _directory.SchoolExistsAsync(request.SchoolId, cancellationToken))
        {
            throw new NotFoundAppException("School was not found.");
        }

        var mobileNumber = request.MobileNumber.AsTrimmedOrNull();
        var cnic = request.Cnic.AsTrimmedOrNull();
        var existing = await FindExistingUserForAdditionalRoleAsync(mobileNumber, cnic, cancellationToken);
        if (existing is not null)
        {
            try
            {
                existing.AddRole(UserRole.SchoolAdmin, DateTimeOffset.UtcNow);
            }
            catch (BusinessRuleException exception)
            {
                throw new ValidationAppException([exception.Message]);
            }

            existing.UpdateProfile(request.FullName.AsTrimmedString());
            existing.AssignSchoolCampus(request.SchoolId, campusId: null);
            existing.UpdateContactInfo(mobileNumber, cnic, request.EmailAddress);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var existingSchool = await _directory.GetSchoolAsync(request.SchoolId, cancellationToken);
            return new DirectorySchoolAdminResponse(
                existing.Id,
                existing.FullName,
                existing.Username,
                request.SchoolId,
                existingSchool?.Name ?? "—",
                existing.MobileNumber,
                existing.Cnic,
                existing.IsActive,
                existing.NeedsPasswordSetup);
        }

        var username = request.Username.AsTrimmedString();
        if (await _users.UsernameExistsAsync(username, cancellationToken))
        {
            throw new ValidationAppException(["Username is already taken."]);
        }

        // Auto-approved; School Admin sets password on first login.
        var user = User.CreateProvisionedAccount(
            username,
            request.FullName.AsTrimmedString(),
            UserRole.SchoolAdmin,
            request.SchoolId,
            campusId: null,
            mobileNumber,
            cnic,
            request.EmailAddress);
        await _users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var school = await _directory.GetSchoolAsync(request.SchoolId, cancellationToken);
        return new DirectorySchoolAdminResponse(
            user.Id,
            user.FullName,
            user.Username,
            request.SchoolId,
            school?.Name ?? "—",
            user.MobileNumber,
            user.Cnic,
            user.IsActive,
            user.NeedsPasswordSetup);
    }

    public async Task<DirectorySchoolAdminResponse> UpdateSchoolAdminAsync(
        long userId,
        UpdateDirectorySchoolAdminRequest request,
        CancellationToken cancellationToken)
    {
        EnsurePortalAdmin();
        ValidateUpdateSchoolAdminRequest(request);

        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundAppException("School admin was not found.");
        if (!user.HasRole(UserRole.SchoolAdmin))
        {
            throw new NotFoundAppException("School admin was not found.");
        }

        if (!await _directory.SchoolExistsAsync(request.SchoolId, cancellationToken))
        {
            throw new NotFoundAppException("School was not found.");
        }

        user.UpdateProfile(request.FullName);
        user.AssignSchoolCampus(request.SchoolId, null);
        user.UpdateContactInfo(request.MobileNumber, request.Cnic, request.EmailAddress ?? string.Empty);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var school = await _directory.GetSchoolAsync(request.SchoolId, cancellationToken);
        return new DirectorySchoolAdminResponse(
            user.Id,
            user.FullName,
            user.Username,
            request.SchoolId,
            school?.Name ?? "—",
            user.MobileNumber,
            user.Cnic,
            user.IsActive,
            user.NeedsPasswordSetup);
    }

    public async Task ActivateSchoolAdminAsync(long userId, CancellationToken cancellationToken)
    {
        await SetSchoolAdminActiveAsync(userId, true, cancellationToken);
    }

    public async Task DeactivateSchoolAdminAsync(long userId, CancellationToken cancellationToken)
    {
        await SetSchoolAdminActiveAsync(userId, false, cancellationToken);
    }

    public async Task<DirectoryCampusAdminListResponse> ListCampusAdminsAsync(
        int? schoolId,
        int? campusId,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        EnsureCanManageCampusAdmins();
        var (safePageNumber, safePageSize) = NormalizePaging(pageNumber, pageSize);
        var scopedSchoolId = schoolId;
        if (IsSchoolAdmin())
        {
            scopedSchoolId = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
        }

        var (items, totalCount) = await _directory.ListCampusAdminsAsync(
            scopedSchoolId,
            campusId,
            search,
            safePageNumber,
            safePageSize,
            cancellationToken);
        return new DirectoryCampusAdminListResponse(items, safePageNumber, safePageSize, totalCount);
    }

    public async Task<DirectoryCampusAdminResponse> CreateCampusAdminAsync(
        CreateDirectoryCampusAdminRequest request,
        CancellationToken cancellationToken)
    {
        EnsureCanManageCampusAdmins();
        ValidateCreateCampusAdminRequest(request);

        var schoolId = request.SchoolId;
        var campusId = request.CampusId;
        if (IsSchoolAdmin())
        {
            schoolId = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
            if (request.SchoolId != schoolId)
            {
                throw new ForbiddenAppException("You can only create campus admins in your school.");
            }
        }

        await EnsureCampusBelongsToSchoolAsync(schoolId, campusId, cancellationToken);

        var mobileNumber = request.MobileNumber.AsTrimmedOrNull();
        var cnic = request.Cnic.AsTrimmedOrNull();
        var existing = await FindExistingUserForAdditionalRoleAsync(mobileNumber, cnic, cancellationToken);
        if (existing is not null)
        {
            try
            {
                existing.AddRole(UserRole.CampusAdmin, DateTimeOffset.UtcNow);
            }
            catch (BusinessRuleException exception)
            {
                throw new ValidationAppException([exception.Message]);
            }

            existing.UpdateProfile(request.FullName.AsTrimmedString());
            existing.AssignSchoolCampus(schoolId, campusId);
            existing.UpdateContactInfo(mobileNumber, cnic, request.EmailAddress);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return await ToCampusAdminResponseAsync(existing, cancellationToken);
        }

        var username = request.Username.AsTrimmedString();
        if (await _users.UsernameExistsAsync(username, cancellationToken))
        {
            throw new ValidationAppException(["Username is already taken."]);
        }

        var user = User.CreateProvisionedAccount(
            username,
            request.FullName.AsTrimmedString(),
            UserRole.CampusAdmin,
            schoolId,
            campusId,
            mobileNumber,
            cnic,
            request.EmailAddress);
        await _users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await ToCampusAdminResponseAsync(user, cancellationToken);
    }

    public async Task<DirectoryCampusAdminResponse> UpdateCampusAdminAsync(
        long userId,
        UpdateDirectoryCampusAdminRequest request,
        CancellationToken cancellationToken)
    {
        EnsureCanManageCampusAdmins();
        ValidateUpdateCampusAdminRequest(request);

        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundAppException("Campus admin was not found.");
        if (!user.HasRole(UserRole.CampusAdmin))
        {
            throw new NotFoundAppException("Campus admin was not found.");
        }

        EnsureSchoolAccess(user.SchoolId);

        var schoolId = request.SchoolId;
        var campusId = request.CampusId;
        if (IsSchoolAdmin())
        {
            schoolId = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
            if (request.SchoolId != schoolId)
            {
                throw new ForbiddenAppException("You can only manage campus admins in your school.");
            }
        }

        await EnsureCampusBelongsToSchoolAsync(schoolId, campusId, cancellationToken);

        user.UpdateProfile(request.FullName);
        user.AssignSchoolCampus(schoolId, campusId);
        user.UpdateContactInfo(request.MobileNumber, request.Cnic, request.EmailAddress ?? string.Empty);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await ToCampusAdminResponseAsync(user, cancellationToken);
    }

    public async Task ActivateCampusAdminAsync(long userId, CancellationToken cancellationToken)
    {
        await SetCampusAdminActiveAsync(userId, true, cancellationToken);
    }

    public async Task DeactivateCampusAdminAsync(long userId, CancellationToken cancellationToken)
    {
        await SetCampusAdminActiveAsync(userId, false, cancellationToken);
    }

    private async Task SetCampusAdminActiveAsync(long userId, bool isActive, CancellationToken cancellationToken)
    {
        EnsureCanManageCampusAdmins();
        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundAppException("Campus admin was not found.");
        if (!user.HasRole(UserRole.CampusAdmin))
        {
            throw new NotFoundAppException("Campus admin was not found.");
        }

        EnsureSchoolAccess(user.SchoolId);
        await _directory.SetUserActiveAsync(userId, isActive, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<DirectoryCampusAdminResponse> ToCampusAdminResponseAsync(
        User user,
        CancellationToken cancellationToken)
    {
        var schoolId = user.SchoolId ?? 0;
        var campusId = user.CampusId ?? 0;
        var school = schoolId > 0 ? await _directory.GetSchoolAsync(schoolId, cancellationToken) : null;
        var campus = campusId > 0 ? await _directory.GetCampusAsync(campusId, cancellationToken) : null;
        return new DirectoryCampusAdminResponse(
            user.Id,
            user.FullName,
            user.Username,
            schoolId,
            school?.Name ?? "—",
            campusId,
            campus?.Name ?? "—",
            user.MobileNumber,
            user.Cnic,
            user.IsActive,
            user.NeedsPasswordSetup);
    }

    private void EnsureCanManageCampusAdmins()
    {
        var role = ParseRole();
        if (role is not (UserRole.PortalAdmin or UserRole.SchoolAdmin))
        {
            throw new ForbiddenAppException("Only Portal Admin and School Admin can manage campus admins.");
        }
    }

    private static void ValidateCreateCampusAdminRequest(CreateDirectoryCampusAdminRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            errors.Add("Full name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Username))
        {
            errors.Add("Username is required.");
        }

        if (request.SchoolId <= 0)
        {
            errors.Add("School is required.");
        }

        if (request.CampusId <= 0)
        {
            errors.Add("Campus is required.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
    }

    private static void ValidateUpdateCampusAdminRequest(UpdateDirectoryCampusAdminRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            errors.Add("Full name is required.");
        }

        if (request.SchoolId <= 0)
        {
            errors.Add("School is required.");
        }

        if (request.CampusId <= 0)
        {
            errors.Add("Campus is required.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
    }

    private async Task SetSchoolAdminActiveAsync(long userId, bool isActive, CancellationToken cancellationToken)
    {
        EnsurePortalAdmin();
        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundAppException("School admin was not found.");
        if (!user.HasRole(UserRole.SchoolAdmin))
        {
            throw new NotFoundAppException("School admin was not found.");
        }

        await _directory.SetUserActiveAsync(userId, isActive, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static void ValidateCreateSchoolAdminRequest(CreateDirectorySchoolAdminRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            errors.Add("Full name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Username))
        {
            errors.Add("Username is required.");
        }

        if (request.SchoolId <= 0)
        {
            errors.Add("School is required.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
    }

    private static void ValidateUpdateSchoolAdminRequest(UpdateDirectorySchoolAdminRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            errors.Add("Full name is required.");
        }

        if (request.SchoolId <= 0)
        {
            errors.Add("School is required.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
    }

    private void EnsurePortalAdmin()
    {
        if (ParseRole() != UserRole.PortalAdmin)
        {
            throw new ForbiddenAppException("Only Portal Admin can manage school admins.");
        }
    }

    private static IReadOnlyList<long> NormalizeIds(BulkDeactivateRequest request)
    {
        if (request.Ids is null || request.Ids.Count == 0)
        {
            throw new ValidationAppException(["At least one id is required."]);
        }

        return request.Ids.Distinct().ToArray();
    }

    private void EnsureSchoolManager()
    {
        var role = ParseRole();
        if (role is not (UserRole.PortalAdmin or UserRole.SchoolAdmin))
        {
            throw new ForbiddenAppException("Only Portal Admin and School Admin can manage schools and campuses.");
        }
    }

    private void EnsureAdmin()
    {
        var role = ParseRole();
        if (role is not (UserRole.PortalAdmin or UserRole.SchoolAdmin or UserRole.CampusAdmin))
        {
            throw new ForbiddenAppException("Only administrators can manage the directory.");
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

    private static void ValidateCreateStudentRequest(CreateDirectoryStudentRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            errors.Add("Full name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Username))
        {
            errors.Add("Username is required.");
        }

        if (string.IsNullOrWhiteSpace(request.RollNumber))
        {
            errors.Add("Roll number is required.");
        }

        if (request.Grade <= 0)
        {
            errors.Add("Grade is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Section))
        {
            errors.Add("Section is required.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
    }

    private static void ValidateUpdateStudentRequest(UpdateDirectoryStudentRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            errors.Add("Full name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.RollNumber))
        {
            errors.Add("Roll number is required.");
        }

        if (request.Grade <= 0)
        {
            errors.Add("Grade is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Section))
        {
            errors.Add("Section is required.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
    }

    private static void ValidateCreateTeacherRequest(CreateDirectoryTeacherRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            errors.Add("Full name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Username))
        {
            errors.Add("Username is required.");
        }

        if (string.IsNullOrWhiteSpace(request.TeacherCode))
        {
            errors.Add("Teacher code is required.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
    }

    private static void ValidateUpdateTeacherRequest(UpdateDirectoryTeacherRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            errors.Add("Full name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.TeacherCode))
        {
            errors.Add("Teacher code is required.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
    }

    private static void ValidateCreateParentRequest(CreateDirectoryParentRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            errors.Add("Full name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Username))
        {
            errors.Add("Username is required.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
    }

    private static void ValidateUpdateParentRequest(UpdateDirectoryParentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new ValidationAppException(["Full name is required."]);
        }
    }

    private void EnsureDirectoryReader()
    {
        var role = ParseRole();
        if (role is not (UserRole.PortalAdmin or UserRole.SchoolAdmin or UserRole.CampusAdmin or UserRole.Teacher))
        {
            throw new ForbiddenAppException("You do not have access to the student directory.");
        }
    }

    private bool IsSchoolAdmin()
        => ParseRole() == UserRole.SchoolAdmin;

    private bool IsCampusAdmin()
        => ParseRole() == UserRole.CampusAdmin;

    private async Task<User?> FindExistingUserForAdditionalRoleAsync(
        string? mobileNumber,
        string? cnic,
        CancellationToken cancellationToken)
    {
        if (mobileNumber.HasTrimmedText())
        {
            var byMobile = await _users.GetByMobileNumberAsync(mobileNumber!, cancellationToken);
            if (byMobile is not null)
            {
                return byMobile;
            }
        }

        if (cnic.HasTrimmedText())
        {
            return await _users.GetByCnicAsync(cnic!, cancellationToken);
        }

        return null;
    }

    private async Task<DirectoryTeacherResponse> AddTeacherRoleToExistingUserAsync(
        User existing,
        CreateDirectoryTeacherRequest request,
        int schoolId,
        int campusId,
        string? mobileNumber,
        CancellationToken cancellationToken)
    {
        try
        {
            existing.AddRole(UserRole.Teacher, DateTimeOffset.UtcNow);
        }
        catch (BusinessRuleException exception)
        {
            throw new ValidationAppException([exception.Message]);
        }

        existing.UpdateProfile(request.FullName.AsTrimmedString());
        existing.AssignSchoolCampus(schoolId, campusId);
        existing.UpdateContactInfo(mobileNumber, cnic: null);
        existing.SetRollNumberTeacherCode(request.TeacherCode.AsTrimmedString());

        if (!await _users.HasTeacherProfileAsync(existing.Id, cancellationToken))
        {
            await _users.AddTeacherProfileAsync(new Teacher(existing.Id, mobileNumber), cancellationToken);
        }

        existing.AttachProfileContext(existing.Id, schoolId, campusId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new DirectoryTeacherResponse(
            existing.Id,
            existing.FullName,
            existing.Username,
            request.TeacherCode.AsTrimmedString(),
            schoolId,
            campusId,
            existing.IsActive);
    }

    private async Task<DirectoryParentResponse> AddParentRoleToExistingUserAsync(
        User existing,
        CreateDirectoryParentRequest request,
        string? mobileNumber,
        string? cnic,
        CancellationToken cancellationToken)
    {
        try
        {
            existing.AddRole(UserRole.Parent, DateTimeOffset.UtcNow);
        }
        catch (BusinessRuleException exception)
        {
            throw new ValidationAppException([exception.Message]);
        }

        existing.UpdateProfile(request.FullName.AsTrimmedString());
        existing.UpdateContactInfo(mobileNumber, cnic);

        if (!await _users.HasParentProfileAsync(existing.Id, cancellationToken))
        {
            await _users.AddParentProfileAsync(new Parent(existing.Id, mobileNumber), cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        var linkedCount = await _directory.CountParentStudentLinksAsync(existing.Id, cancellationToken);
        return new DirectoryParentResponse(
            existing.Id,
            existing.FullName,
            existing.Username,
            linkedCount,
            existing.IsActive);
    }

    private void EnsureSchoolAccess(long schoolId)
        => EnsureSchoolAccess((int?)schoolId);

    private void EnsureSchoolAccess(int? schoolId)
    {
        if (IsCampusAdmin())
        {
            var campusSchoolId = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
            if (schoolId is null || schoolId.Value != campusSchoolId)
            {
                throw new ForbiddenAppException("You can only access resources in your school.");
            }

            return;
        }

        if (!IsSchoolAdmin())
        {
            return;
        }

        var adminSchoolId = _currentUser.SchoolId
            ?? throw new ForbiddenAppException("School context was not found.");

        if (schoolId is null || schoolId.Value != adminSchoolId)
        {
            throw new ForbiddenAppException("You can only access resources in your school.");
        }
    }

    private void EnsureCampusAccess(int? campusId)
    {
        if (!IsCampusAdmin())
        {
            return;
        }

        var adminCampusId = _currentUser.CampusId
            ?? throw new ForbiddenAppException("Campus context was not found.");
        if (campusId is null || campusId.Value != adminCampusId)
        {
            throw new ForbiddenAppException("You can only access resources in your campus.");
        }
    }

    private (int? SchoolId, int? CampusId) ResolveSchoolCampusFilter(int? schoolId, int? campusId)
    {
        var role = ParseRole();
        if (role == UserRole.CampusAdmin)
        {
            var scopedSchoolId = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
            var scopedCampusId = _currentUser.CampusId
                ?? throw new ForbiddenAppException("Campus context was not found.");
            return (scopedSchoolId, scopedCampusId);
        }

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
