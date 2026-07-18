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
            .Select(school => new SchoolResponse(school.Id, school.Name, school.Code, school.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<SchoolResponse?> GetSchoolAsync(long schoolId, CancellationToken cancellationToken)
    {
        return await _dbContext.Schools.AsNoTracking()
            .Where(school => school.Id == schoolId && !school.IsDeleted)
            .Select(school => new SchoolResponse(school.Id, school.Name, school.Code, school.IsActive))
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
        return new SchoolResponse(school.Id, school.Name, school.Code, school.IsActive);
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
        return new SchoolResponse(school.Id, school.Name, school.Code, school.IsActive);
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
        var items = await query
            .OrderBy(row => row.user.FullName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(row => new DirectoryStudentResponse(
                row.student.Id,
                row.user.FullName,
                row.user.Username,
                row.user.RollNumberTeacherCode ?? string.Empty,
                row.student.Grade,
                row.student.Section,
                row.user.SchoolId ?? 0,
                row.user.CampusId ?? 0,
                row.user.IsActive))
            .ToListAsync(cancellationToken);

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
        var items = await query
            .OrderBy(row => row.user.FullName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(row => new DirectoryTeacherResponse(
                row.teacher.Id,
                row.user.FullName,
                row.user.Username,
                row.user.RollNumberTeacherCode ?? string.Empty,
                row.user.SchoolId ?? 0,
                row.user.CampusId ?? 0,
                row.user.IsActive))
            .ToListAsync(cancellationToken);

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
        var linkCounts = await _dbContext.ParentStudentRelations.AsNoTracking()
            .Where(relation => parentIds.Contains(relation.ParentId) && relation.IsActive)
            .GroupBy(relation => relation.ParentId)
            .Select(group => new { ParentId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.ParentId, item => item.Count, cancellationToken);

        var items = rows.Select(row => new DirectoryParentResponse(
            row.parent.Id,
            row.user.FullName,
            row.user.Username,
            linkCounts.GetValueOrDefault(row.parent.Id),
            row.user.IsActive)).ToArray();

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
                    user.IsActive,
                    user.NeedsPasswordSetup);
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
                    user.IsActive,
                    user.NeedsPasswordSetup);
            })
            .ToArray();

        return (items, totalCount);
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
