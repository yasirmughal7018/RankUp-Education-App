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

/// <summary>
/// Orchestrates school directory CRUD and user provisioning with role-based school/campus scoping.
/// </summary>
public sealed class DirectoryService : IDirectoryService
{
    private readonly IDirectoryRepository _directory;
    private readonly IUserRepository _users;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IUnitOfWork _unitOfWork;

    public DirectoryService(
        IDirectoryRepository directory,
        IUserRepository users,
        ICurrentUserService currentUser,
        IDateTimeProvider dateTimeProvider,
        IUnitOfWork unitOfWork)
    {
        _directory = directory;
        _users = users;
        _currentUser = currentUser;
        _dateTimeProvider = dateTimeProvider;
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

        var coordinators = await _directory.CountUsersByStatusAsync(
            UserRole.Coordinator,
            schoolId,
            campusId,
            cancellationToken);

        // Parents are scoped via linked students (they usually have no school on the user row).
        var parents = await _directory.CountParentsLinkedToStudentsByStatusAsync(
            schoolId,
            campusId,
            cancellationToken);

        var visibleSections = new List<string>
        {
            "schools",
            "students",
            "parents",
            "teachers",
            "coordinators",
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
            coordinators,
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

        var emailAddress = ResolveEmailUsername(request.EmailAddress, request.Username);
        if (await _users.UsernameExistsAsync(emailAddress, cancellationToken))
        {
            throw new ValidationAppException(["An account already exists for this email address."]);
        }

        var mobileNumber = request.MobileNumber.AsTrimmedOrNull();
        if (mobileNumber is not null && await _users.MobileNumberExistsAsync(mobileNumber, cancellationToken))
        {
            throw new ValidationAppException(["An account already exists for this mobile number."]);
        }

        // Auto-approved; user sets password on first login. Username = email.
        var user = User.CreateProvisionedAccount(
            emailAddress,
            request.FullName.AsTrimmedString(),
            UserRole.Student,
            schoolId,
            campusId,
            mobileNumber,
            emailAddress: emailAddress);
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
            user.IsActive,
            user.AvatarUrl,
            "—",
            "—",
            Array.Empty<string>(),
            user.MobileNumber,
            user.Cnic,
            user.EmailAddress,
            user.CreatedDate,
            user.RequestedAt,
            user.RejectedAt,
            user.LastLoginAt,
            user.ReasonMessage,
            user.NeedsPasswordSetup,
            Array.Empty<DirectoryApprovalHistoryItem>(),
            DirectoryAccountStatuses.FromUser(user));
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
            user.IsActive,
            user.AvatarUrl,
            "—",
            "—",
            Array.Empty<string>(),
            user.MobileNumber,
            user.Cnic,
            user.EmailAddress,
            user.CreatedDate,
            user.RequestedAt,
            user.RejectedAt,
            user.LastLoginAt,
            user.ReasonMessage,
            user.NeedsPasswordSetup,
            Array.Empty<DirectoryApprovalHistoryItem>(),
            DirectoryAccountStatuses.FromUser(user));
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
            if (user is null || !CanManageUserInCurrentScope(user))
            {
                continue;
            }

            await DeactivateDirectoryUserAsync(studentId, cancellationToken);
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
        var emailAddress = ResolveEmailUsername(request.EmailAddress, request.Username);
        var existing = await FindExistingUserForAdditionalRoleAsync(
            mobileNumber,
            cnic: null,
            emailOrUsername: emailAddress,
            cancellationToken);
        if (existing is not null)
        {
            var merged = await AddTeacherRoleToExistingUserAsync(
                existing,
                request,
                schoolId,
                campusId,
                mobileNumber,
                cancellationToken);
            await EnsureTeacherCompanionRolesAsync(
                existing,
                request.AlsoParent,
                request.AlsoCoordinator,
                cancellationToken);
            return merged with { Roles = RoleNames(existing) };
        }

        // Auto-approved; user sets password on first login. Username = email.
        var user = User.CreateProvisionedAccount(
            emailAddress,
            request.FullName.AsTrimmedString(),
            UserRole.Teacher,
            schoolId,
            campusId,
            mobileNumber,
            emailAddress: emailAddress);
        user.SetRollNumberTeacherCode(request.TeacherCode.AsTrimmedString());
        await _users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _users.AddTeacherProfileAsync(
            new Teacher(user.Id, mobileNumber),
            cancellationToken);
        user.AttachProfileContext(user.Id, schoolId, campusId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await EnsureTeacherCompanionRolesAsync(
            user,
            request.AlsoParent,
            request.AlsoCoordinator,
            cancellationToken);

        return new DirectoryTeacherResponse(
            user.Id,
            user.FullName,
            user.Username,
            request.TeacherCode.AsTrimmedString(),
            schoolId,
            campusId,
            user.IsActive,
            user.AvatarUrl,
            "—",
            "—",
            0,
            user.MobileNumber,
            user.Cnic,
            user.EmailAddress,
            user.CreatedDate,
            user.RequestedAt,
            user.RejectedAt,
            user.LastLoginAt,
            user.ReasonMessage,
            user.NeedsPasswordSetup,
            Array.Empty<DirectoryApprovalHistoryItem>(),
            DirectoryAccountStatuses.FromUser(user),
            RoleNames(user));
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

        await EnsureTeacherCompanionRolesAsync(
            user,
            request.AlsoParent,
            request.AlsoCoordinator,
            cancellationToken);

        return new DirectoryTeacherResponse(
            teacher.Id,
            user.FullName,
            user.Username,
            user.RollNumberTeacherCode ?? string.Empty,
            user.SchoolId ?? 0,
            user.CampusId ?? 0,
            user.IsActive,
            user.AvatarUrl,
            "—",
            "—",
            0,
            user.MobileNumber,
            user.Cnic,
            user.EmailAddress,
            user.CreatedDate,
            user.RequestedAt,
            user.RejectedAt,
            user.LastLoginAt,
            user.ReasonMessage,
            user.NeedsPasswordSetup,
            Array.Empty<DirectoryApprovalHistoryItem>(),
            DirectoryAccountStatuses.FromUser(user),
            RoleNames(user));
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
            if (user is null || !CanManageUserInCurrentScope(user))
            {
                continue;
            }

            await DeactivateDirectoryUserAsync(teacherId, cancellationToken);
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
        var (resolvedSchoolId, resolvedCampusId) = ResolveParentVisibilityScope();
        var (items, totalCount) = await _directory.ListParentsAsync(
            search,
            resolvedSchoolId,
            resolvedCampusId,
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
        var emailAddress = ResolveEmailUsername(request.EmailAddress, request.Username);
        var existing = await FindExistingUserForAdditionalRoleAsync(
            mobileNumber,
            cnic,
            emailOrUsername: emailAddress,
            cancellationToken);
        if (existing is not null)
        {
            var merged = await AddParentRoleToExistingUserAsync(
                existing,
                request,
                mobileNumber,
                cnic,
                cancellationToken);
            await EnsureParentCompanionRolesAsync(
                existing,
                request.AlsoCoordinator,
                cancellationToken);
            return merged with { Roles = RoleNames(existing) };
        }

        // Auto-approved; user sets password on first login. Username = email.
        var user = User.CreateProvisionedAccount(
            emailAddress,
            request.FullName.AsTrimmedString(),
            UserRole.Parent,
            mobileNumber: mobileNumber,
            cnic: cnic,
            emailAddress: emailAddress);
        await _users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _users.AddParentProfileAsync(new Parent(user.Id, mobileNumber), cancellationToken);
        user.AttachProfileContext(user.Id, null, null);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await EnsureParentCompanionRolesAsync(
            user,
            request.AlsoCoordinator,
            cancellationToken);

        return new DirectoryParentResponse(
            user.Id,
            user.FullName,
            user.Username,
            0,
            Array.Empty<string>(),
            user.IsActive,
            user.AvatarUrl,
            user.MobileNumber,
            user.Cnic,
            user.EmailAddress,
            user.CreatedDate,
            user.RequestedAt,
            user.RejectedAt,
            user.LastLoginAt,
            user.ReasonMessage,
            user.NeedsPasswordSetup,
            Array.Empty<DirectoryApprovalHistoryItem>(),
            DirectoryAccountStatuses.FromUser(user),
            RoleNames(user));
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

        await EnsureParentAccessibleInScopeAsync(parentId, cancellationToken);

        var user = await _users.GetByIdAsync(parentId, cancellationToken)
            ?? throw new NotFoundAppException("Parent was not found.");

        user.UpdateProfile(request.FullName);
        user.UpdateContactInfo(request.MobileNumber, request.Cnic);
        parent.Update(request.MobileNumber);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await EnsureParentCompanionRolesAsync(
            user,
            request.AlsoCoordinator,
            cancellationToken);

        var linkedCount = await _directory.CountParentStudentLinksAsync(parentId, cancellationToken);
        return new DirectoryParentResponse(
            parent.Id,
            user.FullName,
            user.Username,
            linkedCount,
            Array.Empty<string>(),
            user.IsActive,
            user.AvatarUrl,
            user.MobileNumber,
            user.Cnic,
            user.EmailAddress,
            user.CreatedDate,
            user.RequestedAt,
            user.RejectedAt,
            user.LastLoginAt,
            user.ReasonMessage,
            user.NeedsPasswordSetup,
            Array.Empty<DirectoryApprovalHistoryItem>(),
            DirectoryAccountStatuses.FromUser(user),
            RoleNames(user));
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

            if (!await IsParentAccessibleInScopeAsync(parentId, cancellationToken))
            {
                continue;
            }

            await DeactivateDirectoryUserAsync(parentId, cancellationToken);
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
        EnsureCampusAccess(studentUser.CampusId);

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
            EnsureCampusAccess(studentUser?.CampusId);
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
        if (!isActive)
        {
            await _users.RevokeRefreshTokensForUserAsync(
                studentId,
                _dateTimeProvider.UtcNow,
                cancellationToken);
        }
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
        if (!isActive)
        {
            await _users.RevokeRefreshTokensForUserAsync(
                teacherId,
                _dateTimeProvider.UtcNow,
                cancellationToken);
        }
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task SetParentActiveAsync(long parentId, bool isActive, CancellationToken cancellationToken)
    {
        EnsureAdmin();
        if (!await _directory.ParentExistsAsync(parentId, cancellationToken))
        {
            throw new NotFoundAppException("Parent was not found.");
        }

        await EnsureParentAccessibleInScopeAsync(parentId, cancellationToken);

        await _directory.SetUserActiveAsync(parentId, isActive, cancellationToken);
        if (!isActive)
        {
            await _users.RevokeRefreshTokensForUserAsync(
                parentId,
                _dateTimeProvider.UtcNow,
                cancellationToken);
        }
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
        var emailAddress = ResolveEmailUsername(request.EmailAddress, request.Username);
        var existing = await FindExistingUserForAdditionalRoleAsync(
            mobileNumber,
            cnic,
            emailAddress,
            cancellationToken);
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
                existing.EmailAddress,
                existing.IsActive,
                existing.NeedsPasswordSetup,
                existing.AvatarUrl,
                0,
                0,
                0,
                existing.CreatedDate,
                existing.RequestedAt,
                existing.RejectedAt,
                existing.LastLoginAt,
                existing.ReasonMessage,
                Array.Empty<DirectoryApprovalHistoryItem>(),
                DirectoryAccountStatuses.FromUser(existing));
        }

        if (await _users.UsernameExistsAsync(emailAddress, cancellationToken))
        {
            throw new ValidationAppException(["An account already exists for this email address."]);
        }

        // Auto-approved; School Admin sets password on first login. Username = email.
        var user = User.CreateProvisionedAccount(
            emailAddress,
            request.FullName.AsTrimmedString(),
            UserRole.SchoolAdmin,
            request.SchoolId,
            campusId: null,
            mobileNumber,
            cnic,
            emailAddress);
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
            user.EmailAddress,
            user.IsActive,
            user.NeedsPasswordSetup,
            user.AvatarUrl,
            0,
            0,
            0,
            user.CreatedDate,
            user.RequestedAt,
            user.RejectedAt,
            user.LastLoginAt,
            user.ReasonMessage,
            Array.Empty<DirectoryApprovalHistoryItem>(),
            DirectoryAccountStatuses.FromUser(user));
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
        var emailAddress = request.EmailAddress.AsNormalizedEmailOrNull()
            ?? throw new ValidationAppException(["Email address is required (it is the username)."]);
        await EnsureEmailUsernameAvailableAsync(user.Id, emailAddress, cancellationToken);
        user.SetUsername(emailAddress);
        user.UpdateContactInfo(request.MobileNumber, request.Cnic, emailAddress);
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
            user.EmailAddress,
            user.IsActive,
            user.NeedsPasswordSetup,
            user.AvatarUrl,
            0,
            0,
            0,
            user.CreatedDate,
            user.RequestedAt,
            user.RejectedAt,
            user.LastLoginAt,
            user.ReasonMessage,
            Array.Empty<DirectoryApprovalHistoryItem>(),
            DirectoryAccountStatuses.FromUser(user));
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

    public async Task<DirectoryCoordinatorListResponse> ListCoordinatorsAsync(
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
        var (items, totalCount) = await _directory.ListCoordinatorsAsync(
            resolvedSchoolId,
            resolvedCampusId,
            search,
            safePageNumber,
            safePageSize,
            cancellationToken);
        return new DirectoryCoordinatorListResponse(items, safePageNumber, safePageSize, totalCount);
    }

    public async Task<DirectoryCoordinatorResponse> CreateCoordinatorAsync(
        CreateDirectoryCoordinatorRequest request,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();
        ValidateCreateCoordinatorRequest(request);

        var alsoTeacher = request.AlsoTeacher;
        var (schoolId, campusId) = ResolveCreateSchoolCampus(request.SchoolId, request.CampusId);
        await EnsureCampusBelongsToSchoolAsync(schoolId, campusId, cancellationToken);

        var mobileNumber = request.MobileNumber.AsTrimmedOrNull();
        var emailAddress = ResolveEmailUsername(request.EmailAddress, request.Username);
        var existing = await FindExistingUserForAdditionalRoleAsync(
            mobileNumber,
            cnic: null,
            emailOrUsername: emailAddress,
            cancellationToken);

        if (existing is not null)
        {
            await EnsureCoordinatorOnUserAsync(existing, cancellationToken);
            if (alsoTeacher && !existing.HasRole(UserRole.Teacher))
            {
                var teacherRequest = new CreateDirectoryTeacherRequest(
                    request.FullName,
                    request.Username,
                    schoolId,
                    campusId,
                    request.TeacherCode,
                    mobileNumber,
                    emailAddress);
                await AddTeacherRoleToExistingUserAsync(
                    existing,
                    teacherRequest,
                    schoolId,
                    campusId,
                    mobileNumber,
                    cancellationToken);
            }

            if (request.AlsoParent)
            {
                await EnsureTeacherCompanionRolesAsync(
                    existing,
                    alsoParent: true,
                    alsoCoordinator: true,
                    cancellationToken);
            }

            return ToCoordinatorResponse(existing, schoolId, campusId);
        }

        var user = User.CreateProvisionedAccount(
            emailAddress,
            request.FullName.AsTrimmedString(),
            UserRole.Coordinator,
            schoolId,
            campusId,
            mobileNumber,
            emailAddress: emailAddress);

        if (alsoTeacher)
        {
            user.SetRollNumberTeacherCode(request.TeacherCode.AsTrimmedString());
        }

        await _users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (alsoTeacher)
        {
            try
            {
                user.AddRole(UserRole.Teacher, DateTimeOffset.UtcNow);
            }
            catch (BusinessRuleException exception)
            {
                throw new ValidationAppException([exception.Message]);
            }

            await _users.AddTeacherProfileAsync(
                new Teacher(user.Id, mobileNumber),
                cancellationToken);
        }

        user.AttachProfileContext(user.Id, schoolId, campusId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await EnsureTeacherCompanionRolesAsync(
            user,
            request.AlsoParent,
            alsoCoordinator: false,
            cancellationToken);

        return ToCoordinatorResponse(user, schoolId, campusId);
    }

    public async Task<DirectoryCoordinatorResponse> UpdateCoordinatorAsync(
        long userId,
        UpdateDirectoryCoordinatorRequest request,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();
        ValidateUpdateCoordinatorRequest(request);

        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundAppException("Coordinator was not found.");

        if (!user.HasRole(UserRole.Coordinator))
        {
            throw new NotFoundAppException("Coordinator was not found.");
        }

        EnsureSchoolAccess(user.SchoolId);
        EnsureCampusAccess(user.CampusId);

        var campus = await _directory.GetCampusAsync(request.CampusId, cancellationToken)
            ?? throw new NotFoundAppException("Campus was not found.");
        if (user.SchoolId is null || campus.SchoolId != user.SchoolId)
        {
            throw new ValidationAppException(["Campus must belong to the coordinator's school."]);
        }

        user.UpdateProfile(request.FullName);
        user.AssignSchoolCampus(user.SchoolId, request.CampusId);
        user.UpdateContactInfo(request.MobileNumber.AsTrimmedOrNull(), user.Cnic);
        user.AttachProfileContext(user.Id, user.SchoolId, request.CampusId);

        if (request.AlsoTeacher || user.HasRole(UserRole.Teacher))
        {
            user.SetRollNumberTeacherCode(request.TeacherCode.AsTrimmedString());
        }

        if (request.AlsoTeacher && !user.HasRole(UserRole.Teacher))
        {
            try
            {
                user.AddRole(UserRole.Teacher, DateTimeOffset.UtcNow);
            }
            catch (BusinessRuleException exception)
            {
                throw new ValidationAppException([exception.Message]);
            }

            if (!await _users.HasTeacherProfileAsync(user.Id, cancellationToken))
            {
                await _users.AddTeacherProfileAsync(
                    new Teacher(user.Id, request.MobileNumber.AsTrimmedOrNull() ?? user.MobileNumber),
                    cancellationToken);
            }
        }
        else if (user.HasRole(UserRole.Teacher))
        {
            var teacher = await _directory.GetTeacherEntityAsync(userId, cancellationToken);
            teacher?.Update(request.MobileNumber);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await EnsureTeacherCompanionRolesAsync(
            user,
            request.AlsoParent,
            alsoCoordinator: false,
            cancellationToken);

        return ToCoordinatorResponse(user, user.SchoolId ?? 0, request.CampusId);
    }

    public async Task ActivateCoordinatorAsync(long userId, CancellationToken cancellationToken)
    {
        await SetCoordinatorActiveAsync(userId, true, cancellationToken);
    }

    public async Task DeactivateCoordinatorAsync(long userId, CancellationToken cancellationToken)
    {
        await SetCoordinatorActiveAsync(userId, false, cancellationToken);
    }

    public async Task<BulkActionResponse> BulkDeactivateCoordinatorsAsync(
        BulkDeactivateRequest request,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var ids = NormalizeIds(request);
        var affected = 0;
        foreach (var userId in ids)
        {
            var user = await _users.GetByIdAsync(userId, cancellationToken);
            if (user is null
                || !user.HasRole(UserRole.Coordinator)
                || !CanManageUserInCurrentScope(user))
            {
                continue;
            }

            await DeactivateDirectoryUserAsync(userId, cancellationToken);
            affected++;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return new BulkActionResponse(affected);
    }

    public async Task<DirectoryParentResponse> GrantParentRoleToCoordinatorAsync(
        long userId,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();

        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundAppException("Coordinator was not found.");

        EnsureSchoolAccess(user.SchoolId);
        EnsureCampusAccess(user.CampusId);

        if (!user.HasRole(UserRole.Coordinator))
        {
            throw new ValidationAppException(["This account is not a Coordinator."]);
        }

        if (user.HasRole(UserRole.Parent))
        {
            throw new ValidationAppException(["This account already has the Parent role."]);
        }

        var createRequest = new CreateDirectoryParentRequest(
            user.FullName,
            user.Username,
            user.Cnic,
            user.MobileNumber,
            user.EmailAddress ?? user.Username);

        return await AddParentRoleToExistingUserAsync(
            user,
            createRequest,
            user.MobileNumber,
            user.Cnic,
            cancellationToken);
    }

    public async Task<DirectoryTeacherResponse> GrantTeacherRoleToCoordinatorAsync(
        long userId,
        GrantTeacherRoleRequest request,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();

        if (!request.TeacherCode.HasTrimmedText())
        {
            throw new ValidationAppException(["Teacher code is required."]);
        }

        var (schoolId, campusId) = ResolveCreateSchoolCampus(request.SchoolId, request.CampusId);
        await EnsureCampusBelongsToSchoolAsync(schoolId, campusId, cancellationToken);

        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundAppException("Coordinator was not found.");

        if (!user.HasRole(UserRole.Coordinator))
        {
            throw new ValidationAppException(["This account is not a Coordinator."]);
        }

        if (user.HasRole(UserRole.Teacher))
        {
            throw new ValidationAppException(["This account already has the Teacher role."]);
        }

        var mobileNumber = request.MobileNumber.AsTrimmedOrNull() ?? user.MobileNumber;
        var createRequest = new CreateDirectoryTeacherRequest(
            user.FullName,
            user.Username,
            schoolId,
            campusId,
            request.TeacherCode.AsTrimmedString(),
            mobileNumber,
            user.EmailAddress ?? user.Username);

        return await AddTeacherRoleToExistingUserAsync(
            user,
            createRequest,
            schoolId,
            campusId,
            mobileNumber,
            cancellationToken);
    }

    private async Task SetCoordinatorActiveAsync(long userId, bool isActive, CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundAppException("Coordinator was not found.");

        if (!user.HasRole(UserRole.Coordinator))
        {
            throw new NotFoundAppException("Coordinator was not found.");
        }

        EnsureSchoolAccess(user.SchoolId);
        EnsureCampusAccess(user.CampusId);
        await _directory.SetUserActiveAsync(userId, isActive, cancellationToken);
        if (!isActive)
        {
            await _users.RevokeRefreshTokensForUserAsync(
                userId,
                _dateTimeProvider.UtcNow,
                cancellationToken);
        }
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureCoordinatorOnUserAsync(User user, CancellationToken cancellationToken)
    {
        if (user.HasRole(UserRole.Coordinator))
        {
            return;
        }

        try
        {
            user.AddRole(UserRole.Coordinator, DateTimeOffset.UtcNow);
        }
        catch (BusinessRuleException exception)
        {
            throw new ValidationAppException([exception.Message]);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static DirectoryCoordinatorResponse ToCoordinatorResponse(
        User user,
        int schoolId,
        int campusId)
        => new(
            user.Id,
            user.FullName,
            user.Username,
            user.RollNumberTeacherCode ?? string.Empty,
            schoolId,
            "—",
            campusId,
            "—",
            user.IsActive,
            user.AvatarUrl,
            user.MobileNumber,
            user.Cnic,
            user.EmailAddress,
            user.CreatedDate,
            user.RequestedAt,
            user.RejectedAt,
            user.LastLoginAt,
            user.ReasonMessage,
            user.NeedsPasswordSetup,
            DirectoryAccountStatuses.FromUser(user),
            Array.Empty<DirectoryApprovalHistoryItem>(),
            RoleNames(user));

    private static void ValidateCreateCoordinatorRequest(CreateDirectoryCoordinatorRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            errors.Add("Full name is required.");
        }

        if (ResolveEmailUsernameOrNull(request.EmailAddress, request.Username) is null)
        {
            errors.Add("Email address is required (it is the username).");
        }

        if (request.AlsoTeacher && string.IsNullOrWhiteSpace(request.TeacherCode))
        {
            errors.Add("Teacher code is required when also assigning Teacher.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
    }

    private static void ValidateUpdateCoordinatorRequest(UpdateDirectoryCoordinatorRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            errors.Add("Full name is required.");
        }

        if (request.AlsoTeacher && string.IsNullOrWhiteSpace(request.TeacherCode))
        {
            errors.Add("Teacher code is required when also assigning Teacher.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
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
        var emailAddress = ResolveEmailUsername(request.EmailAddress, request.Username);
        var existing = await FindExistingUserForAdditionalRoleAsync(
            mobileNumber,
            cnic,
            emailAddress,
            cancellationToken);
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

        if (await _users.UsernameExistsAsync(emailAddress, cancellationToken))
        {
            throw new ValidationAppException(["An account already exists for this email address."]);
        }

        var user = User.CreateProvisionedAccount(
            emailAddress,
            request.FullName.AsTrimmedString(),
            UserRole.CampusAdmin,
            schoolId,
            campusId,
            mobileNumber,
            cnic,
            emailAddress);
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
        var emailAddress = request.EmailAddress.AsNormalizedEmailOrNull()
            ?? throw new ValidationAppException(["Email address is required (it is the username)."]);
        await EnsureEmailUsernameAvailableAsync(user.Id, emailAddress, cancellationToken);
        user.SetUsername(emailAddress);
        user.UpdateContactInfo(request.MobileNumber, request.Cnic, emailAddress);
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
        if (!isActive)
        {
            await _users.RevokeRefreshTokensForUserAsync(
                userId,
                _dateTimeProvider.UtcNow,
                cancellationToken);
        }
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
            user.EmailAddress,
            user.IsActive,
            user.NeedsPasswordSetup,
            user.AvatarUrl,
            0,
            0,
            user.CreatedDate,
            user.RequestedAt,
            user.RejectedAt,
            user.LastLoginAt,
            user.ReasonMessage,
            Array.Empty<DirectoryApprovalHistoryItem>(),
            DirectoryAccountStatuses.FromUser(user));
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

        if (ResolveEmailUsernameOrNull(request.EmailAddress, request.Username) is null)
        {
            errors.Add("Email address is required (it is the username).");
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

        if (request.EmailAddress.AsNormalizedEmailOrNull() is null)
        {
            errors.Add("Email address is required (it is the username).");
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
        if (!isActive)
        {
            await _users.RevokeRefreshTokensForUserAsync(
                userId,
                _dateTimeProvider.UtcNow,
                cancellationToken);
        }
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static void ValidateCreateSchoolAdminRequest(CreateDirectorySchoolAdminRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            errors.Add("Full name is required.");
        }

        if (ResolveEmailUsernameOrNull(request.EmailAddress, request.Username) is null)
        {
            errors.Add("Email address is required (it is the username).");
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

        if (request.EmailAddress.AsNormalizedEmailOrNull() is null)
        {
            errors.Add("Email address is required (it is the username).");
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

        if (ResolveEmailUsernameOrNull(request.EmailAddress, request.Username) is null)
        {
            errors.Add("Email address is required (it is the username).");
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

        if (ResolveEmailUsernameOrNull(request.EmailAddress, request.Username) is null)
        {
            errors.Add("Email address is required (it is the username).");
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

        if (ResolveEmailUsernameOrNull(request.EmailAddress, request.Username) is null)
        {
            errors.Add("Email address is required (it is the username).");
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
        if (role is not (UserRole.PortalAdmin or UserRole.SchoolAdmin or UserRole.CampusAdmin or UserRole.Teacher or UserRole.Coordinator))
        {
            throw new ForbiddenAppException("You do not have access to the student directory.");
        }
    }

    private bool IsSchoolAdmin()
        => ParseRole() == UserRole.SchoolAdmin;

    private bool IsCampusAdmin()
        => ParseRole() == UserRole.CampusAdmin;

    private bool CanManageUserInCurrentScope(User user)
    {
        var role = ParseRole();
        if (role == UserRole.PortalAdmin)
        {
            return true;
        }

        var schoolId = _currentUser.SchoolId;
        if (!schoolId.HasValue || user.SchoolId != schoolId)
        {
            return false;
        }

        if (role == UserRole.SchoolAdmin)
        {
            return true;
        }

        return role == UserRole.CampusAdmin
            && _currentUser.CampusId.HasValue
            && user.CampusId == _currentUser.CampusId;
    }

    private async Task DeactivateDirectoryUserAsync(
        long userId,
        CancellationToken cancellationToken)
    {
        await _directory.SetUserActiveAsync(userId, false, cancellationToken);
        await _users.RevokeRefreshTokensForUserAsync(
            userId,
            _dateTimeProvider.UtcNow,
            cancellationToken);
    }

    private async Task<User?> FindExistingUserForAdditionalRoleAsync(
        string? mobileNumber,
        string? cnic,
        string? emailOrUsername,
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
            var byCnic = await _users.GetByCnicAsync(cnic!, cancellationToken);
            if (byCnic is not null)
            {
                return byCnic;
            }
        }

        if (emailOrUsername.HasTrimmedText())
        {
            return await _users.GetByUsernameAsync(emailOrUsername!, cancellationToken);
        }

        return null;
    }

    private static IReadOnlyList<string> RoleNames(User user)
        => user.Roles.Select(static role => role.ToString()).ToArray();

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
            existing.IsActive,
            existing.AvatarUrl,
            "—",
            "—",
            0,
            existing.MobileNumber,
            existing.Cnic,
            existing.EmailAddress,
            existing.CreatedDate,
            existing.RequestedAt,
            existing.RejectedAt,
            existing.LastLoginAt,
            existing.ReasonMessage,
            existing.NeedsPasswordSetup,
            Array.Empty<DirectoryApprovalHistoryItem>(),
            DirectoryAccountStatuses.FromUser(existing),
            RoleNames(existing));
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
            Array.Empty<string>(),
            existing.IsActive,
            existing.AvatarUrl,
            existing.MobileNumber,
            existing.Cnic,
            existing.EmailAddress,
            existing.CreatedDate,
            existing.RequestedAt,
            existing.RejectedAt,
            existing.LastLoginAt,
            existing.ReasonMessage,
            existing.NeedsPasswordSetup,
            Array.Empty<DirectoryApprovalHistoryItem>(),
            DirectoryAccountStatuses.FromUser(existing),
            RoleNames(existing));
    }

    public async Task<DirectoryTeacherResponse> GrantTeacherRoleToParentAsync(
        long parentId,
        GrantTeacherRoleRequest request,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();

        if (!request.TeacherCode.HasTrimmedText())
        {
            throw new ValidationAppException(["Teacher code is required."]);
        }

        var (schoolId, campusId) = ResolveCreateSchoolCampus(request.SchoolId, request.CampusId);
        await EnsureCampusBelongsToSchoolAsync(schoolId, campusId, cancellationToken);

        var user = await _users.GetByIdAsync(parentId, cancellationToken)
            ?? throw new NotFoundAppException("Parent was not found.");

        if (!user.HasRole(UserRole.Parent))
        {
            throw new ValidationAppException(["This account is not a Parent."]);
        }

        if (user.HasRole(UserRole.Teacher))
        {
            throw new ValidationAppException(["This account already has the Teacher role."]);
        }

        var mobileNumber = request.MobileNumber.AsTrimmedOrNull() ?? user.MobileNumber;
        var createRequest = new CreateDirectoryTeacherRequest(
            user.FullName,
            user.Username,
            schoolId,
            campusId,
            request.TeacherCode.AsTrimmedString(),
            mobileNumber,
            user.EmailAddress ?? user.Username);

        return await AddTeacherRoleToExistingUserAsync(
            user,
            createRequest,
            schoolId,
            campusId,
            mobileNumber,
            cancellationToken);
    }

    public async Task<DirectoryParentResponse> GrantParentRoleToTeacherAsync(
        long teacherId,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();

        var user = await _users.GetByIdAsync(teacherId, cancellationToken)
            ?? throw new NotFoundAppException("Teacher was not found.");

        EnsureSchoolAccess(user.SchoolId);
        EnsureCampusAccess(user.CampusId);

        if (!user.HasRole(UserRole.Teacher))
        {
            throw new ValidationAppException(["This account is not a Teacher."]);
        }

        if (user.HasRole(UserRole.Parent))
        {
            throw new ValidationAppException(["This account already has the Parent role."]);
        }

        var createRequest = new CreateDirectoryParentRequest(
            user.FullName,
            user.Username,
            user.Cnic,
            user.MobileNumber,
            user.EmailAddress ?? user.Username);

        return await AddParentRoleToExistingUserAsync(
            user,
            createRequest,
            user.MobileNumber,
            user.Cnic,
            cancellationToken);
    }

    public async Task<GrantCoordinatorRoleResponse> GrantCoordinatorRoleToTeacherAsync(
        long teacherId,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();

        var user = await _users.GetByIdAsync(teacherId, cancellationToken)
            ?? throw new NotFoundAppException("Teacher was not found.");

        EnsureSchoolAccess(user.SchoolId);
        EnsureCampusAccess(user.CampusId);

        if (!user.HasRole(UserRole.Teacher))
        {
            throw new ValidationAppException(["This account is not a Teacher."]);
        }

        return await AddCoordinatorRoleAsync(user, cancellationToken);
    }

    public async Task<GrantCoordinatorRoleResponse> GrantCoordinatorRoleToParentAsync(
        long parentId,
        CancellationToken cancellationToken)
    {
        EnsureAdmin();

        var user = await _users.GetByIdAsync(parentId, cancellationToken)
            ?? throw new NotFoundAppException("Parent was not found.");

        await EnsureParentAccessibleInScopeAsync(parentId, cancellationToken);

        if (!user.HasRole(UserRole.Parent))
        {
            throw new ValidationAppException(["This account is not a Parent."]);
        }

        return await AddCoordinatorRoleAsync(user, cancellationToken);
    }

    private async Task<GrantCoordinatorRoleResponse> AddCoordinatorRoleAsync(
        User user,
        CancellationToken cancellationToken)
    {
        try
        {
            user.AddRole(UserRole.Coordinator, DateTimeOffset.UtcNow);
        }
        catch (BusinessRuleException exception)
        {
            throw new ValidationAppException([exception.Message]);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new GrantCoordinatorRoleResponse(
            user.Id,
            user.FullName,
            user.Username,
            RoleNames(user));
    }

    /// <summary>
    /// Adds Parent and/or Coordinator onto a Teacher account so one login can hold all three.
    /// </summary>
    private async Task EnsureTeacherCompanionRolesAsync(
        User user,
        bool alsoParent,
        bool alsoCoordinator,
        CancellationToken cancellationToken)
    {
        var changed = false;

        if (alsoParent && !user.HasRole(UserRole.Parent))
        {
            try
            {
                user.AddRole(UserRole.Parent, DateTimeOffset.UtcNow);
            }
            catch (BusinessRuleException exception)
            {
                throw new ValidationAppException([exception.Message]);
            }

            if (!await _users.HasParentProfileAsync(user.Id, cancellationToken))
            {
                await _users.AddParentProfileAsync(
                    new Parent(user.Id, user.MobileNumber),
                    cancellationToken);
            }

            changed = true;
        }

        if (alsoCoordinator && !user.HasRole(UserRole.Coordinator))
        {
            try
            {
                user.AddRole(UserRole.Coordinator, DateTimeOffset.UtcNow);
            }
            catch (BusinessRuleException exception)
            {
                throw new ValidationAppException([exception.Message]);
            }

            changed = true;
        }

        if (changed)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
    }

    /// <summary>Adds Coordinator onto a Parent account (may already also be Teacher).</summary>
    private async Task EnsureParentCompanionRolesAsync(
        User user,
        bool alsoCoordinator,
        CancellationToken cancellationToken)
    {
        if (!alsoCoordinator || user.HasRole(UserRole.Coordinator))
        {
            return;
        }

        try
        {
            user.AddRole(UserRole.Coordinator, DateTimeOffset.UtcNow);
        }
        catch (BusinessRuleException exception)
        {
            throw new ValidationAppException([exception.Message]);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
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

        if (role is UserRole.SchoolAdmin or UserRole.Teacher or UserRole.Coordinator)
        {
            var scopedSchoolId = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
            var scopedCampusId = campusId ?? _currentUser.CampusId;
            return (scopedSchoolId, scopedCampusId);
        }

        return (schoolId, campusId);
    }

    /// <summary>
    /// School/Campus Admin only see parents linked to students in their school/campus.
    /// Portal Admin sees all parents. School Admin covers the whole school (not a single campus).
    /// </summary>
    private (int? SchoolId, int? CampusId) ResolveParentVisibilityScope()
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

        if (role == UserRole.SchoolAdmin)
        {
            var scopedSchoolId = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
            return (scopedSchoolId, null);
        }

        return (null, null);
    }

    private async Task EnsureParentAccessibleInScopeAsync(
        long parentId,
        CancellationToken cancellationToken)
    {
        if (!await IsParentAccessibleInScopeAsync(parentId, cancellationToken))
        {
            throw new ForbiddenAppException(
                "You can only manage parents linked to students in your school or campus.");
        }
    }

    private async Task<bool> IsParentAccessibleInScopeAsync(
        long parentId,
        CancellationToken cancellationToken)
    {
        var (schoolId, campusId) = ResolveParentVisibilityScope();
        return await _directory.ParentHasStudentInScopeAsync(
            parentId,
            schoolId,
            campusId,
            cancellationToken);
    }

    private UserRole ParseRole()
    {
        if (string.IsNullOrWhiteSpace(_currentUser.Role))
        {
            throw new AuthenticationAppException("Authentication is required.");
        }

        return Enum.Parse<UserRole>(_currentUser.Role, ignoreCase: true);
    }

    /// <summary>Email is the username for Student / Teacher / Parent / SchoolAdmin / CampusAdmin.</summary>
    private static string ResolveEmailUsername(string? emailAddress, string? usernameFallback)
        => ResolveEmailUsernameOrNull(emailAddress, usernameFallback)
            ?? throw new ValidationAppException(["Email address is required (it is the username)."]);

    private static string? ResolveEmailUsernameOrNull(string? emailAddress, string? usernameFallback)
        => emailAddress.AsNormalizedEmailOrNull()
            ?? usernameFallback.AsNormalizedEmailOrNull();

    private async Task EnsureEmailUsernameAvailableAsync(
        long userId,
        string emailAddress,
        CancellationToken cancellationToken)
    {
        if (await _users.UsernameExistsAsync(emailAddress, cancellationToken))
        {
            var existing = await _users.GetByLoginIdentifierAsync(emailAddress, cancellationToken);
            if (existing is null || existing.Id != userId)
            {
                throw new ValidationAppException(["An account already exists for this email address."]);
            }
        }
    }
}
