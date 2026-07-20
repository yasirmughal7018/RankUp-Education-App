using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Directory;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Contracts.Directory;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Parents;
using RankUpEducation.Domain.Schools;
using RankUpEducation.Domain.Students;
using RankUpEducation.Domain.Teachers;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

public sealed class DirectoryRepository : IDirectoryRepository
{
    private readonly RankUpDbContext _dbContext;

    public DirectoryRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<SchoolResponse>> ListSchoolsAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Schools.AsNoTracking()
            .Where(school => !school.IsDeleted)
            .OrderBy(school => school.Name)
            .Select(school => new SchoolResponse(
                school.Id,
                school.Name,
                school.Code,
                school.IsActive,
                _dbContext.Campuses.Count(campus =>
                    campus.SchoolId == school.Id && !campus.IsDeleted)))
            .ToListAsync(cancellationToken);
    }

    public async Task<SchoolResponse?> GetSchoolAsync(long schoolId, CancellationToken cancellationToken)
    {
        return await _dbContext.Schools.AsNoTracking()
            .Where(school => school.Id == schoolId && !school.IsDeleted)
            .Select(school => new SchoolResponse(
                school.Id,
                school.Name,
                school.Code,
                school.IsActive,
                _dbContext.Campuses.Count(campus =>
                    campus.SchoolId == school.Id && !campus.IsDeleted)))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<SchoolResponse> CreateSchoolAsync(
        string name,
        string code,
        bool isActive,
        CancellationToken cancellationToken)
    {
        var school = new School(name, code);
        school.SetActive(isActive);
        await _dbContext.Schools.AddAsync(school, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return new SchoolResponse(school.Id, school.Name, school.Code, school.IsActive, CampusCount: 0);
    }

    public async Task<SchoolResponse?> UpdateSchoolAsync(
        long schoolId,
        string name,
        string code,
        bool isActive,
        CancellationToken cancellationToken)
    {
        var school = await _dbContext.Schools
            .FirstOrDefaultAsync(item => item.Id == schoolId && !item.IsDeleted, cancellationToken);
        if (school is null)
        {
            return null;
        }

        school.Update(name, code);
        school.SetActive(isActive);
        await _dbContext.SaveChangesAsync(cancellationToken);
        var campusCount = await _dbContext.Campuses.AsNoTracking()
            .CountAsync(campus => campus.SchoolId == school.Id && !campus.IsDeleted, cancellationToken);
        return new SchoolResponse(school.Id, school.Name, school.Code, school.IsActive, campusCount);
    }

    public async Task<bool> SetSchoolActiveAsync(long schoolId, bool isActive, CancellationToken cancellationToken)
    {
        var school = await _dbContext.Schools
            .FirstOrDefaultAsync(item => item.Id == schoolId && !item.IsDeleted, cancellationToken);
        if (school is null)
        {
            return false;
        }

        school.SetActive(isActive);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<CampusResponse>> ListCampusesAsync(long schoolId, CancellationToken cancellationToken)
    {
        var campuses = await _dbContext.Campuses.AsNoTracking()
            .Where(campus => campus.SchoolId == schoolId && !campus.IsDeleted)
            .OrderBy(campus => campus.Name)
            .Select(campus => new
            {
                campus.Id,
                campus.SchoolId,
                campus.Name,
                campus.Address,
                campus.IsActive,
            })
            .ToListAsync(cancellationToken);

        return campuses
            .Select(campus => new CampusResponse(
                campus.Id,
                campus.SchoolId,
                campus.Name,
                campus.Address.AsTrimmedOrNull(),
                campus.IsActive))
            .ToArray();
    }

    public async Task<CampusResponse?> GetCampusAsync(long campusId, CancellationToken cancellationToken)
    {
        var campus = await _dbContext.Campuses.AsNoTracking()
            .Where(item => item.Id == campusId && !item.IsDeleted)
            .Select(item => new
            {
                item.Id,
                item.SchoolId,
                item.Name,
                item.Address,
                item.IsActive,
            })
            .FirstOrDefaultAsync(cancellationToken);

        return campus is null
            ? null
            : new CampusResponse(
                campus.Id,
                campus.SchoolId,
                campus.Name,
                campus.Address.AsTrimmedOrNull(),
                campus.IsActive);
    }

    public async Task<CampusResponse> CreateCampusAsync(
        long schoolId,
        string name,
        string address,
        bool isActive,
        CancellationToken cancellationToken)
    {
        var campus = new Campus((int)schoolId, name, address);
        campus.SetActive(isActive);
        await _dbContext.Campuses.AddAsync(campus, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return new CampusResponse(
            campus.Id,
            campus.SchoolId,
            campus.Name,
            campus.Address.AsTrimmedOrNull(),
            campus.IsActive);
    }

    public async Task<CampusResponse?> UpdateCampusAsync(
        long campusId,
        string name,
        string address,
        bool isActive,
        CancellationToken cancellationToken)
    {
        var campus = await _dbContext.Campuses
            .FirstOrDefaultAsync(item => item.Id == campusId && !item.IsDeleted, cancellationToken);
        if (campus is null)
        {
            return null;
        }

        campus.Update(name, address);
        campus.SetActive(isActive);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return new CampusResponse(
            campus.Id,
            campus.SchoolId,
            campus.Name,
            campus.Address.AsTrimmedOrNull(),
            campus.IsActive);
    }

    public async Task<bool> SetCampusActiveAsync(long campusId, bool isActive, CancellationToken cancellationToken)
    {
        var campus = await _dbContext.Campuses
            .FirstOrDefaultAsync(item => item.Id == campusId && !item.IsDeleted, cancellationToken);
        if (campus is null)
        {
            return false;
        }

        campus.SetActive(isActive);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public Task<bool> SchoolExistsAsync(long schoolId, CancellationToken cancellationToken)
    {
        return _dbContext.Schools.AsNoTracking()
            .AnyAsync(school => school.Id == schoolId && !school.IsDeleted, cancellationToken);
    }

    public async Task<(IReadOnlyList<DirectoryStudentResponse> Items, int TotalCount)> ListStudentsAsync(
        int? schoolId,
        int? campusId,
        short? grade,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query =
            from student in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            where user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Student)
            select new { student, user };

        if (schoolId is not null)
        {
            query = query.Where(row => row.user.SchoolId == schoolId.Value);
        }

        if (campusId is not null)
        {
            query = query.Where(row => row.user.CampusId == campusId.Value);
        }

        if (grade is not null)
        {
            query = query.Where(row => row.student.Grade == grade.Value);
        }

        if (search.HasTrimmedText())
        {
            var term = search.AsTrimmedString();
            query = query.Where(row =>
                row.user.FullName.Contains(term)
                || row.user.Username.Contains(term)
                || (row.user.RollNumberTeacherCode != null && row.user.RollNumberTeacherCode.Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderBy(row => row.user.FullName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(row => new
            {
                row.student.Id,
                row.user.FullName,
                row.user.Username,
                RollNumber = row.user.RollNumberTeacherCode ?? string.Empty,
                row.student.Grade,
                row.student.Section,
                SchoolId = row.user.SchoolId ?? 0,
                CampusId = row.user.CampusId ?? 0,
                row.user.IsActive,
                row.user.AvatarUrl,
                MobileNumber = row.user.MobileNumber ?? row.student.MobileNumber,
                row.user.Cnic,
                row.user.EmailAddress,
                row.user.CreatedDate,
                row.user.RequestedAt,
                row.user.RejectedAt,
                row.user.LastLoginAt,
                row.user.ReasonMessage,
                row.user.PasswordHash,
            })
            .ToListAsync(cancellationToken);

        var lockedSet = await GetLockedUserIdsAsync(
            rows.Select(row => row.Id).ToArray(),
            cancellationToken);

        var schoolIds = rows.Select(row => row.SchoolId).Where(id => id > 0).Distinct().ToArray();
        var campusIds = rows.Select(row => row.CampusId).Where(id => id > 0).Distinct().ToArray();
        var studentIds = rows.Select(row => row.Id).ToArray();

        var schoolNames = await GetSchoolNamesAsync(schoolIds, cancellationToken);
        var campusNames = await GetCampusNamesAsync(campusIds, cancellationToken);
        var teacherNamesByStudent = await GetTeacherNamesByStudentAsync(studentIds, cancellationToken);
        var approvalHistory = await GetApprovalHistoryByUserIdsAsync(studentIds, cancellationToken);

        var items = rows
            .Select(row => new DirectoryStudentResponse(
                row.Id,
                row.FullName,
                row.Username,
                row.RollNumber,
                row.Grade,
                row.Section,
                row.SchoolId,
                row.CampusId,
                row.IsActive,
                row.AvatarUrl,
                schoolNames.GetValueOrDefault(row.SchoolId, "—"),
                campusNames.GetValueOrDefault(row.CampusId, "—"),
                teacherNamesByStudent.GetValueOrDefault(row.Id, Array.Empty<string>()),
                row.MobileNumber,
                row.Cnic,
                row.EmailAddress,
                row.CreatedDate,
                row.RequestedAt,
                row.RejectedAt,
                row.LastLoginAt,
                row.ReasonMessage,
                row.IsActive && string.IsNullOrWhiteSpace(row.PasswordHash),
                approvalHistory.GetValueOrDefault(row.Id, Array.Empty<DirectoryApprovalHistoryItem>()),
                DirectoryAccountStatuses.Resolve(
                    row.IsActive,
                    !string.IsNullOrWhiteSpace(row.PasswordHash),
                    row.RejectedAt is not null,
                    lockedSet.Contains(row.Id))))
            .ToArray();

        return (items, totalCount);
    }

    public async Task<(IReadOnlyList<DirectoryTeacherResponse> Items, int TotalCount)> ListTeachersAsync(
        int? schoolId,
        int? campusId,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query =
            from teacher in _dbContext.Teachers.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on teacher.Id equals user.Id
            where user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Teacher)
            select new { teacher, user };

        if (schoolId is not null)
        {
            query = query.Where(row => row.user.SchoolId == schoolId.Value);
        }

        if (campusId is not null)
        {
            query = query.Where(row => row.user.CampusId == campusId.Value);
        }

        if (search.HasTrimmedText())
        {
            var term = search.AsTrimmedString();
            query = query.Where(row =>
                row.user.FullName.Contains(term)
                || row.user.Username.Contains(term)
                || (row.user.RollNumberTeacherCode != null && row.user.RollNumberTeacherCode.Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderBy(row => row.user.FullName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(row => new
            {
                row.teacher.Id,
                row.user.FullName,
                row.user.Username,
                TeacherCode = row.user.RollNumberTeacherCode ?? string.Empty,
                SchoolId = row.user.SchoolId ?? 0,
                CampusId = row.user.CampusId ?? 0,
                row.user.IsActive,
                row.user.AvatarUrl,
                MobileNumber = row.user.MobileNumber ?? row.teacher.MobileNumber,
                row.user.Cnic,
                row.user.EmailAddress,
                row.user.CreatedDate,
                row.user.RequestedAt,
                row.user.RejectedAt,
                row.user.LastLoginAt,
                row.user.ReasonMessage,
                row.user.PasswordHash,
            })
            .ToListAsync(cancellationToken);

        var lockedSet = await GetLockedUserIdsAsync(
            rows.Select(row => row.Id).ToArray(),
            cancellationToken);

        var schoolIds = rows.Select(row => row.SchoolId).Where(id => id > 0).Distinct().ToArray();
        var campusIds = rows.Select(row => row.CampusId).Where(id => id > 0).Distinct().ToArray();
        var teacherIds = rows.Select(row => row.Id).ToArray();

        var schoolNames = await GetSchoolNamesAsync(schoolIds, cancellationToken);
        var campusNames = await GetCampusNamesAsync(campusIds, cancellationToken);
        var studentCounts = await GetTeacherStudentCountsAsync(teacherIds, cancellationToken);
        var approvalHistory = await GetApprovalHistoryByUserIdsAsync(teacherIds, cancellationToken);

        var items = rows
            .Select(row => new DirectoryTeacherResponse(
                row.Id,
                row.FullName,
                row.Username,
                row.TeacherCode,
                row.SchoolId,
                row.CampusId,
                row.IsActive,
                row.AvatarUrl,
                schoolNames.GetValueOrDefault(row.SchoolId, "—"),
                campusNames.GetValueOrDefault(row.CampusId, "—"),
                studentCounts.GetValueOrDefault(row.Id),
                row.MobileNumber,
                row.Cnic,
                row.EmailAddress,
                row.CreatedDate,
                row.RequestedAt,
                row.RejectedAt,
                row.LastLoginAt,
                row.ReasonMessage,
                row.IsActive && string.IsNullOrWhiteSpace(row.PasswordHash),
                approvalHistory.GetValueOrDefault(row.Id, Array.Empty<DirectoryApprovalHistoryItem>()),
                DirectoryAccountStatuses.Resolve(
                    row.IsActive,
                    !string.IsNullOrWhiteSpace(row.PasswordHash),
                    row.RejectedAt is not null,
                    lockedSet.Contains(row.Id))))
            .ToArray();

        return (items, totalCount);
    }

    public async Task<(IReadOnlyList<DirectoryParentResponse> Items, int TotalCount)> ListParentsAsync(
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query =
            from parent in _dbContext.Parents.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on parent.Id equals user.Id
            where user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Parent)
            select new { parent, user };

        if (search.HasTrimmedText())
        {
            var term = search.AsTrimmedString();
            query = query.Where(row =>
                row.user.FullName.Contains(term) || row.user.Username.Contains(term));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderBy(row => row.user.FullName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        if (rows.Count == 0)
        {
            return (Array.Empty<DirectoryParentResponse>(), totalCount);
        }

        var parentIds = rows.Select(row => row.parent.Id).ToArray();
        var linkedStudents = await (
            from relation in _dbContext.ParentStudentRelations.AsNoTracking()
            join studentUser in _dbContext.Users.AsNoTracking() on relation.StudentId equals studentUser.Id
            where parentIds.Contains(relation.ParentId) && relation.IsActive
            orderby studentUser.FullName
            select new { relation.ParentId, studentUser.FullName }
        ).ToListAsync(cancellationToken);

        var linkedNamesByParent = linkedStudents
            .GroupBy(item => item.ParentId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<string>)group.Select(item => item.FullName).ToArray());

        var lockedSet = await GetLockedUserIdsAsync(parentIds, cancellationToken);
        var approvalHistory = await GetApprovalHistoryByUserIdsAsync(parentIds, cancellationToken);

        var items = rows.Select(row => new DirectoryParentResponse(
            row.parent.Id,
            row.user.FullName,
            row.user.Username,
            linkedNamesByParent.GetValueOrDefault(row.parent.Id, Array.Empty<string>()).Count,
            linkedNamesByParent.GetValueOrDefault(row.parent.Id, Array.Empty<string>()),
            row.user.IsActive,
            row.user.AvatarUrl,
            row.user.MobileNumber ?? row.parent.MobileNumber,
            row.user.Cnic,
            row.user.EmailAddress,
            row.user.CreatedDate,
            row.user.RequestedAt,
            row.user.RejectedAt,
            row.user.LastLoginAt,
            row.user.ReasonMessage,
            row.user.NeedsPasswordSetup,
            approvalHistory.GetValueOrDefault(row.parent.Id, Array.Empty<DirectoryApprovalHistoryItem>()),
            DirectoryAccountStatuses.FromUser(row.user, lockedSet.Contains(row.parent.Id)))).ToArray();

        return (items, totalCount);
    }

    public Task<Student?> GetStudentEntityAsync(long studentId, CancellationToken cancellationToken)
    {
        return _dbContext.Students
            .FirstOrDefaultAsync(student => student.Id == studentId, cancellationToken);
    }

    public Task<Teacher?> GetTeacherEntityAsync(long teacherId, CancellationToken cancellationToken)
    {
        return _dbContext.Teachers
            .FirstOrDefaultAsync(teacher => teacher.Id == teacherId, cancellationToken);
    }

    public Task<Parent?> GetParentEntityAsync(long parentId, CancellationToken cancellationToken)
    {
        return _dbContext.Parents
            .FirstOrDefaultAsync(parent => parent.Id == parentId, cancellationToken);
    }

    public async Task SetUserActiveAsync(long userId, bool isActive, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(item => item.Id == userId, cancellationToken)
            ?? throw new InvalidOperationException($"User {userId} was not found.");

        user.SetActive(isActive);
    }

    public async Task LinkParentStudentAsync(
        long parentId,
        long studentId,
        string relationship,
        CancellationToken cancellationToken)
    {
        var existing = await _dbContext.ParentStudentRelations
            .FirstOrDefaultAsync(
                relation => relation.ParentId == parentId && relation.StudentId == studentId,
                cancellationToken);

        if (existing is null)
        {
            await _dbContext.ParentStudentRelations.AddAsync(
                new ParentStudentRelation(parentId, studentId, relationship),
                cancellationToken);
            return;
        }

        existing.Activate(relationship);
    }

    public async Task UnlinkParentStudentAsync(long parentId, long studentId, CancellationToken cancellationToken)
    {
        var existing = await _dbContext.ParentStudentRelations
            .FirstOrDefaultAsync(
                relation => relation.ParentId == parentId && relation.StudentId == studentId && relation.IsActive,
                cancellationToken);

        existing?.Deactivate();
    }

    public Task<bool> ParentExistsAsync(long parentId, CancellationToken cancellationToken)
    {
        return _dbContext.Parents.AsNoTracking()
            .AnyAsync(parent => parent.Id == parentId, cancellationToken);
    }

    public Task<bool> StudentExistsAsync(long studentId, CancellationToken cancellationToken)
    {
        return _dbContext.Students.AsNoTracking()
            .AnyAsync(student => student.Id == studentId, cancellationToken);
    }

    public Task<int> CountParentStudentLinksAsync(long parentId, CancellationToken cancellationToken)
    {
        return _dbContext.ParentStudentRelations.AsNoTracking()
            .CountAsync(
                relation => relation.ParentId == parentId && relation.IsActive,
                cancellationToken);
    }

    public async Task<(IReadOnlyList<DirectorySchoolAdminResponse> Items, int TotalCount)> ListSchoolAdminsAsync(
        int? schoolId,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Users.AsNoTracking()
            .Where(user => user.RoleAssignments.Any(assignment => assignment.Role == UserRole.SchoolAdmin));

        if (schoolId is not null)
        {
            query = query.Where(user => user.SchoolId == schoolId.Value);
        }

        if (search.HasTrimmedText())
        {
            var term = search.AsTrimmedString();
            query = query.Where(user =>
                user.FullName.Contains(term)
                || user.Username.Contains(term)
                || (user.MobileNumber != null && user.MobileNumber.Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var users = await query
            .OrderBy(user => user.FullName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var schoolIds = users
            .Where(user => user.SchoolId.HasValue)
            .Select(user => (long)user.SchoolId!.Value)
            .Distinct()
            .ToArray();

        var schoolNames = await _dbContext.Schools.AsNoTracking()
            .Where(school => schoolIds.Contains(school.Id) && !school.IsDeleted)
            .ToDictionaryAsync(school => school.Id, school => school.Name, cancellationToken);

        var lockedSet = await GetLockedUserIdsAsync(
            users.Select(user => user.Id).ToArray(),
            cancellationToken);

        var schoolIdKeys = users
            .Select(user => user.SchoolId ?? 0)
            .Where(id => id > 0)
            .Distinct()
            .ToArray();
        var campusCounts = await CountActiveCampusesBySchoolAsync(schoolIdKeys, cancellationToken);
        var teacherCounts = await CountReadyUsersBySchoolAsync(UserRole.Teacher, schoolIdKeys, cancellationToken);
        var studentCounts = await CountReadyUsersBySchoolAsync(UserRole.Student, schoolIdKeys, cancellationToken);
        var approvalHistory = await GetApprovalHistoryByUserIdsAsync(
            users.Select(user => user.Id).ToArray(),
            cancellationToken);

        var items = users
            .Select(user =>
            {
                var sid = user.SchoolId ?? 0;
                var schoolName = schoolNames.TryGetValue(sid, out var name) ? name : "—";
                return new DirectorySchoolAdminResponse(
                    user.Id,
                    user.FullName,
                    user.Username,
                    sid,
                    schoolName,
                    user.MobileNumber,
                    user.Cnic,
                    user.EmailAddress,
                    user.IsActive,
                    user.NeedsPasswordSetup,
                    user.AvatarUrl,
                    campusCounts.GetValueOrDefault(sid),
                    teacherCounts.GetValueOrDefault(sid),
                    studentCounts.GetValueOrDefault(sid),
                    user.CreatedDate,
                    user.RequestedAt,
                    user.RejectedAt,
                    user.LastLoginAt,
                    user.ReasonMessage,
                    approvalHistory.GetValueOrDefault(user.Id, Array.Empty<DirectoryApprovalHistoryItem>()),
                    DirectoryAccountStatuses.FromUser(user, lockedSet.Contains(user.Id)));
            })
            .ToArray();

        return (items, totalCount);
    }

    public async Task<(IReadOnlyList<DirectoryCampusAdminResponse> Items, int TotalCount)> ListCampusAdminsAsync(
        int? schoolId,
        int? campusId,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Users.AsNoTracking()
            .Where(user => user.RoleAssignments.Any(assignment => assignment.Role == UserRole.CampusAdmin));

        if (schoolId is not null)
        {
            query = query.Where(user => user.SchoolId == schoolId.Value);
        }

        if (campusId is not null)
        {
            query = query.Where(user => user.CampusId == campusId.Value);
        }

        if (search.HasTrimmedText())
        {
            var term = search.AsTrimmedString();
            query = query.Where(user =>
                user.FullName.Contains(term)
                || user.Username.Contains(term)
                || (user.MobileNumber != null && user.MobileNumber.Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var users = await query
            .OrderBy(user => user.FullName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var schoolIds = users
            .Where(user => user.SchoolId.HasValue)
            .Select(user => (long)user.SchoolId!.Value)
            .Distinct()
            .ToArray();
        var campusIds = users
            .Where(user => user.CampusId.HasValue)
            .Select(user => (long)user.CampusId!.Value)
            .Distinct()
            .ToArray();

        var schoolNames = await _dbContext.Schools.AsNoTracking()
            .Where(school => schoolIds.Contains(school.Id) && !school.IsDeleted)
            .ToDictionaryAsync(school => school.Id, school => school.Name, cancellationToken);
        var campusNames = await _dbContext.Campuses.AsNoTracking()
            .Where(campus => campusIds.Contains(campus.Id) && !campus.IsDeleted)
            .ToDictionaryAsync(campus => campus.Id, campus => campus.Name, cancellationToken);

        var lockedSet = await GetLockedUserIdsAsync(
            users.Select(user => user.Id).ToArray(),
            cancellationToken);

        var campusIdKeys = users
            .Select(user => user.CampusId ?? 0)
            .Where(id => id > 0)
            .Distinct()
            .ToArray();
        var teacherCounts = await CountReadyUsersByCampusAsync(UserRole.Teacher, campusIdKeys, cancellationToken);
        var studentCounts = await CountReadyUsersByCampusAsync(UserRole.Student, campusIdKeys, cancellationToken);
        var approvalHistory = await GetApprovalHistoryByUserIdsAsync(
            users.Select(user => user.Id).ToArray(),
            cancellationToken);

        var items = users
            .Select(user =>
            {
                var sid = user.SchoolId ?? 0;
                var cid = user.CampusId ?? 0;
                return new DirectoryCampusAdminResponse(
                    user.Id,
                    user.FullName,
                    user.Username,
                    sid,
                    schoolNames.TryGetValue(sid, out var schoolName) ? schoolName : "—",
                    cid,
                    campusNames.TryGetValue(cid, out var campusName) ? campusName : "—",
                    user.MobileNumber,
                    user.Cnic,
                    user.EmailAddress,
                    user.IsActive,
                    user.NeedsPasswordSetup,
                    user.AvatarUrl,
                    teacherCounts.GetValueOrDefault(cid),
                    studentCounts.GetValueOrDefault(cid),
                    user.CreatedDate,
                    user.RequestedAt,
                    user.RejectedAt,
                    user.LastLoginAt,
                    user.ReasonMessage,
                    approvalHistory.GetValueOrDefault(user.Id, Array.Empty<DirectoryApprovalHistoryItem>()),
                    DirectoryAccountStatuses.FromUser(user, lockedSet.Contains(user.Id)));
            })
            .ToArray();

        return (items, totalCount);
    }

    private async Task<Dictionary<int, string>> GetSchoolNamesAsync(
        IReadOnlyList<int> schoolIds,
        CancellationToken cancellationToken)
    {
        if (schoolIds.Count == 0)
        {
            return new Dictionary<int, string>();
        }

        var ids = schoolIds.Select(id => (long)id).ToArray();
        return await _dbContext.Schools.AsNoTracking()
            .Where(school => ids.Contains(school.Id) && !school.IsDeleted)
            .ToDictionaryAsync(school => (int)school.Id, school => school.Name, cancellationToken);
    }

    private async Task<Dictionary<int, string>> GetCampusNamesAsync(
        IReadOnlyList<int> campusIds,
        CancellationToken cancellationToken)
    {
        if (campusIds.Count == 0)
        {
            return new Dictionary<int, string>();
        }

        var ids = campusIds.Select(id => (long)id).ToArray();
        return await _dbContext.Campuses.AsNoTracking()
            .Where(campus => ids.Contains(campus.Id) && !campus.IsDeleted)
            .ToDictionaryAsync(campus => (int)campus.Id, campus => campus.Name, cancellationToken);
    }

    private async Task<Dictionary<int, int>> CountActiveCampusesBySchoolAsync(
        IReadOnlyList<int> schoolIds,
        CancellationToken cancellationToken)
    {
        if (schoolIds.Count == 0)
        {
            return new Dictionary<int, int>();
        }

        return await _dbContext.Campuses.AsNoTracking()
            .Where(campus => schoolIds.Contains(campus.SchoolId) && !campus.IsDeleted && campus.IsActive)
            .GroupBy(campus => campus.SchoolId)
            .Select(group => new { SchoolId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.SchoolId, item => item.Count, cancellationToken);
    }

    private async Task<Dictionary<int, int>> CountReadyUsersBySchoolAsync(
        UserRole role,
        IReadOnlyList<int> schoolIds,
        CancellationToken cancellationToken)
    {
        if (schoolIds.Count == 0)
        {
            return new Dictionary<int, int>();
        }

        return await _dbContext.Users.AsNoTracking()
            .Where(user =>
                user.SchoolId != null
                && schoolIds.Contains(user.SchoolId.Value)
                && user.IsActive
                && user.RejectedAt == null
                && user.PasswordHash != null
                && user.PasswordHash != ""
                && user.RoleAssignments.Any(assignment => assignment.Role == role))
            .GroupBy(user => user.SchoolId!.Value)
            .Select(group => new { SchoolId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.SchoolId, item => item.Count, cancellationToken);
    }

    private async Task<Dictionary<int, int>> CountReadyUsersByCampusAsync(
        UserRole role,
        IReadOnlyList<int> campusIds,
        CancellationToken cancellationToken)
    {
        if (campusIds.Count == 0)
        {
            return new Dictionary<int, int>();
        }

        return await _dbContext.Users.AsNoTracking()
            .Where(user =>
                user.CampusId != null
                && campusIds.Contains(user.CampusId.Value)
                && user.IsActive
                && user.RejectedAt == null
                && user.PasswordHash != null
                && user.PasswordHash != ""
                && user.RoleAssignments.Any(assignment => assignment.Role == role))
            .GroupBy(user => user.CampusId!.Value)
            .Select(group => new { CampusId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.CampusId, item => item.Count, cancellationToken);
    }

    private async Task<Dictionary<long, int>> GetTeacherStudentCountsAsync(
        IReadOnlyList<long> teacherIds,
        CancellationToken cancellationToken)
    {
        if (teacherIds.Count == 0)
        {
            return new Dictionary<long, int>();
        }

        var rows = await (
            from groupEntity in _dbContext.StudentGroups.AsNoTracking()
            join member in _dbContext.StudentGroupMembers.AsNoTracking()
                on groupEntity.Id equals member.StudentGroupId
            join studentUser in _dbContext.Users.AsNoTracking() on member.StudentId equals studentUser.Id
            where teacherIds.Contains(groupEntity.ReferralId)
                && groupEntity.IsActive
                && groupEntity.CreatorRole == UserRole.Teacher
                && studentUser.IsActive
                && studentUser.RejectedAt == null
                && studentUser.PasswordHash != null
                && studentUser.PasswordHash != ""
                && studentUser.RoleAssignments.Any(assignment => assignment.Role == UserRole.Student)
            select new { TeacherId = groupEntity.ReferralId, member.StudentId })
            .Distinct()
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(row => row.TeacherId)
            .ToDictionary(group => group.Key, group => group.Select(row => row.StudentId).Distinct().Count());
    }

    private async Task<Dictionary<long, IReadOnlyList<string>>> GetTeacherNamesByStudentAsync(
        IReadOnlyList<long> studentIds,
        CancellationToken cancellationToken)
    {
        if (studentIds.Count == 0)
        {
            return new Dictionary<long, IReadOnlyList<string>>();
        }

        var rows = await (
            from member in _dbContext.StudentGroupMembers.AsNoTracking()
            join groupEntity in _dbContext.StudentGroups.AsNoTracking()
                on member.StudentGroupId equals groupEntity.Id
            join teacherUser in _dbContext.Users.AsNoTracking() on groupEntity.ReferralId equals teacherUser.Id
            where studentIds.Contains(member.StudentId)
                && groupEntity.IsActive
                && groupEntity.CreatorRole == UserRole.Teacher
                && teacherUser.RoleAssignments.Any(assignment => assignment.Role == UserRole.Teacher)
            select new { member.StudentId, teacherUser.FullName })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(row => row.StudentId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<string>)group
                    .Select(row => row.FullName)
                    .Where(name => !string.IsNullOrWhiteSpace(name))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(name => name)
                    .ToArray());
    }

    private async Task<HashSet<long>> GetLockedUserIdsAsync(
        IReadOnlyList<long> userIds,
        CancellationToken cancellationToken)
    {
        if (userIds.Count == 0)
        {
            return [];
        }

        var pendingChange = SchoolChangeRequestStatus.Pending;
        var lockedIds = await _dbContext.UserSchoolChangeRequests.AsNoTracking()
            .Where(request =>
                request.Status == pendingChange && userIds.Contains(request.UserId))
            .Select(request => request.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        return lockedIds.ToHashSet();
    }

    public async Task<DirectorySchoolStatusCounts> CountSchoolsByStatusAsync(
        int? schoolId,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Schools.AsNoTracking()
            .Where(school => !school.IsDeleted);

        if (schoolId is not null)
        {
            query = query.Where(school => school.Id == schoolId.Value);
        }

        var active = await query.CountAsync(school => school.IsActive, cancellationToken);
        var inactive = await query.CountAsync(school => !school.IsActive, cancellationToken);
        return new DirectorySchoolStatusCounts(active, inactive, active + inactive);
    }

    public async Task<DirectoryStatusCounts> CountUsersByStatusAsync(
        UserRole role,
        int? schoolId,
        int? campusId,
        CancellationToken cancellationToken)
    {
        // Count by role assignment on app_users so pending registrations
        // (no Student/Teacher/Parent profile yet) are included in totals.
        var users = _dbContext.Users.AsNoTracking()
            .Where(user => user.RoleAssignments.Any(assignment => assignment.Role == role));

        if (schoolId is not null)
        {
            users = users.Where(user => user.SchoolId == schoolId.Value);
        }

        if (campusId is not null)
        {
            users = users.Where(user => user.CampusId == campusId.Value);
        }

        var pendingChange = SchoolChangeRequestStatus.Pending;

        var rows = await users
            .Select(user => new
            {
                user.Id,
                user.IsActive,
                user.PasswordHash,
                user.RejectedAt,
            })
            .ToListAsync(cancellationToken);

        if (rows.Count == 0)
        {
            return new DirectoryStatusCounts(0, 0, 0, 0, 0, 0, 0, 0);
        }

        var userIds = rows.Select(row => row.Id).ToArray();
        var lockedUserIds = await _dbContext.UserSchoolChangeRequests.AsNoTracking()
            .Where(request =>
                request.Status == pendingChange && userIds.Contains(request.UserId))
            .Select(request => request.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);
        var lockedSet = lockedUserIds.ToHashSet();

        var activeReady = 0;
        var pendingApproval = 0;
        var needsPasswordSetup = 0;
        var locked = 0;
        var deactivated = 0;
        var rejected = 0;

        foreach (var row in rows)
        {
            var hasPassword = !string.IsNullOrWhiteSpace(row.PasswordHash);

            if (row.RejectedAt is not null)
            {
                rejected++;
                continue;
            }

            if (row.IsActive && !hasPassword)
            {
                needsPasswordSetup++;
                continue;
            }

            if (row.IsActive && hasPassword)
            {
                activeReady++;
                continue;
            }

            if (!hasPassword)
            {
                pendingApproval++;
                continue;
            }

            if (lockedSet.Contains(row.Id))
            {
                locked++;
            }
            else
            {
                deactivated++;
            }
        }

        // Align with QA login-status states (mutually exclusive):
        // Active = Ready only (is_active + password set). NeedsPasswordSetup is separate.
        var active = activeReady;
        var total = activeReady + pendingApproval + needsPasswordSetup + locked + deactivated + rejected;
        return new DirectoryStatusCounts(
            active,
            activeReady,
            pendingApproval,
            needsPasswordSetup,
            locked,
            deactivated,
            rejected,
            total);
    }

    private async Task<Dictionary<long, IReadOnlyList<DirectoryApprovalHistoryItem>>> GetApprovalHistoryByUserIdsAsync(
        IReadOnlyList<long> userIds,
        CancellationToken cancellationToken)
    {
        if (userIds.Count == 0)
        {
            return new Dictionary<long, IReadOnlyList<DirectoryApprovalHistoryItem>>();
        }

        var rows = await (
            from approval in _dbContext.UserApprovals.AsNoTracking()
            join admin in _dbContext.Users.AsNoTracking() on approval.ApprovedByUserId equals admin.Id
            where userIds.Contains(approval.UserId)
            orderby approval.ApprovedAt descending, approval.Id descending
            select new
            {
                approval.UserId,
                approval.ApprovedByUserId,
                ApproverName = admin.FullName,
                approval.ApprovedByRole,
                approval.IsApproved,
                approval.ApprovedAt,
            }
        ).ToListAsync(cancellationToken);

        return rows
            .GroupBy(row => row.UserId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<DirectoryApprovalHistoryItem>)group
                    .Select(row => new DirectoryApprovalHistoryItem(
                        row.ApprovedByUserId,
                        row.ApproverName,
                        FormatApproverRole(row.ApprovedByRole),
                        FormatApprovalDecision(row.IsApproved),
                        row.ApprovedAt))
                    .ToArray());
    }

    private static string FormatApproverRole(UserRole role)
        => role switch
        {
            UserRole.PortalAdmin => "Portal Admin",
            UserRole.SchoolAdmin => "School Admin",
            UserRole.CampusAdmin => "Campus Admin",
            UserRole.Teacher => "Teacher",
            UserRole.Parent => "Parent",
            UserRole.Student => "Student",
            _ => role.ToString(),
        };

    private static string FormatApprovalDecision(bool? isApproved)
        => isApproved switch
        {
            true => "Approved",
            false => "Rejected",
            null => "Pending",
        };

    private IQueryable<User> BuildUserQueryForRole(UserRole role)
    {
        return role switch
        {
            UserRole.Student =>
                from student in _dbContext.Students.AsNoTracking()
                join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
                where user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Student)
                select user,

            UserRole.Teacher =>
                from teacher in _dbContext.Teachers.AsNoTracking()
                join user in _dbContext.Users.AsNoTracking() on teacher.Id equals user.Id
                where user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Teacher)
                select user,

            UserRole.Parent =>
                from parent in _dbContext.Parents.AsNoTracking()
                join user in _dbContext.Users.AsNoTracking() on parent.Id equals user.Id
                where user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Parent)
                select user,

            _ => _dbContext.Users.AsNoTracking()
                .Where(user => user.RoleAssignments.Any(assignment => assignment.Role == role)),
        };
    }
}
