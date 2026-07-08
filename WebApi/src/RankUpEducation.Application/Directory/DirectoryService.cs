using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Contracts.Directory;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Parents;
using RankUpEducation.Domain.Students;
using RankUpEducation.Domain.Teachers;

namespace RankUpEducation.Application.Directory;

public sealed class DirectoryService : IDirectoryService
{
    private readonly IDirectoryRepository _directory;
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ICurrentUserService _currentUser;
    private readonly IUnitOfWork _unitOfWork;

    public DirectoryService(
        IDirectoryRepository directory,
        IUserRepository users,
        IPasswordHasher passwordHasher,
        ICurrentUserService currentUser,
        IUnitOfWork unitOfWork)
    {
        _directory = directory;
        _users = users;
        _passwordHasher = passwordHasher;
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
        EnsureAdmin();
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

        var username = request.Username.Trim();
        if (await _users.UsernameExistsAsync(username, cancellationToken))
        {
            throw new ValidationAppException(["Username is already taken."]);
        }

        var passwordHash = _passwordHasher.Hash(request.Password);
        var user = new User(username, passwordHash, request.FullName.Trim(), UserRole.Student, null, schoolId, campusId);
        await _users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var mobileNumber = string.IsNullOrWhiteSpace(request.MobileNumber) ? null : request.MobileNumber.Trim();
        var section = string.IsNullOrWhiteSpace(request.Section) ? "A" : request.Section.Trim();
        await _users.AddStudentProfileAsync(
            new Student(user.Id, schoolId, campusId, request.RollNumber.Trim(), request.Grade, section, mobileNumber),
            cancellationToken);
        user.AttachProfileContext(user.Id, schoolId, campusId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new DirectoryStudentResponse(
            user.Id,
            user.FullName,
            user.Username,
            request.RollNumber.Trim(),
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
        EnsureSchoolAccess(student.SchoolId);

        var campus = await _directory.GetCampusAsync(request.CampusId, cancellationToken)
            ?? throw new NotFoundAppException("Campus was not found.");
        if (campus.SchoolId != student.SchoolId)
        {
            throw new ValidationAppException(["Campus must belong to the student's school."]);
        }

        var user = await _users.GetByIdAsync(studentId, cancellationToken)
            ?? throw new NotFoundAppException("Student was not found.");

        user.UpdateProfile(request.FullName);
        student.Update(
            request.CampusId,
            request.RollNumber,
            request.Grade,
            request.Section,
            request.MobileNumber);
        user.AttachProfileContext(user.Id, student.SchoolId, request.CampusId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new DirectoryStudentResponse(
            student.Id,
            user.FullName,
            user.Username,
            student.StudentRollNumber,
            student.Grade,
            student.Section,
            student.SchoolId,
            student.CampusId,
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

            if (IsSchoolAdmin() && _currentUser.SchoolId != student.SchoolId)
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

        var username = request.Username.Trim();
        if (await _users.UsernameExistsAsync(username, cancellationToken))
        {
            throw new ValidationAppException(["Username is already taken."]);
        }

        var passwordHash = _passwordHasher.Hash(request.Password);
        var user = new User(username, passwordHash, request.FullName.Trim(), UserRole.Teacher, null, schoolId, campusId);
        await _users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var mobileNumber = string.IsNullOrWhiteSpace(request.MobileNumber) ? null : request.MobileNumber.Trim();
        await _users.AddTeacherProfileAsync(
            new Teacher(user.Id, schoolId, campusId, request.TeacherCode.Trim(), mobileNumber),
            cancellationToken);
        user.AttachProfileContext(user.Id, schoolId, campusId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new DirectoryTeacherResponse(
            user.Id,
            user.FullName,
            user.Username,
            request.TeacherCode.Trim(),
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
        EnsureSchoolAccess(teacher.SchoolId);

        var campus = await _directory.GetCampusAsync(request.CampusId, cancellationToken)
            ?? throw new NotFoundAppException("Campus was not found.");
        if (campus.SchoolId != teacher.SchoolId)
        {
            throw new ValidationAppException(["Campus must belong to the teacher's school."]);
        }

        var user = await _users.GetByIdAsync(teacherId, cancellationToken)
            ?? throw new NotFoundAppException("Teacher was not found.");

        user.UpdateProfile(request.FullName);
        teacher.Update(request.CampusId, request.TeacherCode, request.MobileNumber);
        user.AttachProfileContext(user.Id, teacher.SchoolId, request.CampusId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new DirectoryTeacherResponse(
            teacher.Id,
            user.FullName,
            user.Username,
            teacher.TeacherCode,
            teacher.SchoolId,
            teacher.CampusId,
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

            if (IsSchoolAdmin() && _currentUser.SchoolId != teacher.SchoolId)
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

        var username = request.Username.Trim();
        if (await _users.UsernameExistsAsync(username, cancellationToken))
        {
            throw new ValidationAppException(["Username is already taken."]);
        }

        var passwordHash = _passwordHasher.Hash(request.Password);
        var user = new User(username, passwordHash, request.FullName.Trim(), UserRole.Parent);
        await _users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var mobileNumber = string.IsNullOrWhiteSpace(request.MobileNumber) ? null : request.MobileNumber.Trim();
        var cnic = string.IsNullOrWhiteSpace(request.Cnic) ? null : request.Cnic.Trim();
        await _users.AddParentProfileAsync(new Parent(user.Id, cnic, mobileNumber), cancellationToken);
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
        parent.Update(request.Cnic, request.MobileNumber);
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
        EnsureSchoolAccess(student.SchoolId);

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
        var student = await _directory.GetStudentEntityAsync(studentId, cancellationToken);
        if (student is not null)
        {
            EnsureSchoolAccess(student.SchoolId);
        }

        await _directory.UnlinkParentStudentAsync(parentId, studentId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task SetStudentActiveAsync(long studentId, bool isActive, CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var student = await _directory.GetStudentEntityAsync(studentId, cancellationToken)
            ?? throw new NotFoundAppException("Student was not found.");
        EnsureSchoolAccess(student.SchoolId);
        await _directory.SetUserActiveAsync(studentId, isActive, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task SetTeacherActiveAsync(long teacherId, bool isActive, CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var teacher = await _directory.GetTeacherEntityAsync(teacherId, cancellationToken)
            ?? throw new NotFoundAppException("Teacher was not found.");
        EnsureSchoolAccess(teacher.SchoolId);
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

    private static IReadOnlyList<long> NormalizeIds(BulkDeactivateRequest request)
    {
        if (request.Ids is null || request.Ids.Count == 0)
        {
            throw new ValidationAppException(["At least one id is required."]);
        }

        return request.Ids.Distinct().ToArray();
    }

    private void EnsureAdmin()
    {
        var role = ParseRole();
        if (role is not (UserRole.SuperAdmin or UserRole.SchoolAdmin))
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

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
        {
            errors.Add("Password must be at least 6 characters.");
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

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
        {
            errors.Add("Password must be at least 6 characters.");
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

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
        {
            errors.Add("Password must be at least 6 characters.");
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
            throw new ForbiddenAppException("You can only access resources in your school.");
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
