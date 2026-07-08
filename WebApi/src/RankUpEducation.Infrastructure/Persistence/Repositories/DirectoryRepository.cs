using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Directory;
using RankUpEducation.Contracts.Directory;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Parents;
using RankUpEducation.Domain.Schools;

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
        return await _dbContext.Campuses.AsNoTracking()
            .Where(campus => campus.SchoolId == schoolId && !campus.IsDeleted)
            .OrderBy(campus => campus.Name)
            .Select(campus => new CampusResponse(
                campus.Id,
                campus.SchoolId,
                campus.Name,
                string.IsNullOrWhiteSpace(campus.Address) ? null : campus.Address,
                campus.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<CampusResponse?> GetCampusAsync(long campusId, CancellationToken cancellationToken)
    {
        return await _dbContext.Campuses.AsNoTracking()
            .Where(campus => campus.Id == campusId && !campus.IsDeleted)
            .Select(campus => new CampusResponse(
                campus.Id,
                campus.SchoolId,
                campus.Name,
                string.IsNullOrWhiteSpace(campus.Address) ? null : campus.Address,
                campus.IsActive))
            .FirstOrDefaultAsync(cancellationToken);
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
            string.IsNullOrWhiteSpace(campus.Address) ? null : campus.Address,
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
            string.IsNullOrWhiteSpace(campus.Address) ? null : campus.Address,
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

    public async Task<IReadOnlyList<DirectoryStudentResponse>> ListStudentsAsync(
        int? schoolId,
        int? campusId,
        short? grade,
        string? search,
        CancellationToken cancellationToken)
    {
        var query =
            from student in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            where !student.IsDeleted && user.Role == UserRole.Student
            select new { student, user };

        if (schoolId is not null)
        {
            query = query.Where(row => row.student.SchoolId == schoolId.Value);
        }

        if (campusId is not null)
        {
            query = query.Where(row => row.student.CampusId == campusId.Value);
        }

        if (grade is not null)
        {
            query = query.Where(row => row.student.Grade == grade.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(row =>
                row.user.FullName.Contains(term)
                || row.user.Username.Contains(term)
                || row.student.StudentRollNumber.Contains(term));
        }

        return await query
            .OrderBy(row => row.user.FullName)
            .Select(row => new DirectoryStudentResponse(
                row.student.Id,
                row.user.FullName,
                row.user.Username,
                row.student.StudentRollNumber,
                row.student.Grade,
                row.student.Section,
                row.student.SchoolId,
                row.student.CampusId,
                row.user.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<DirectoryTeacherResponse>> ListTeachersAsync(
        int? schoolId,
        int? campusId,
        string? search,
        CancellationToken cancellationToken)
    {
        var query =
            from teacher in _dbContext.Teachers.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on teacher.Id equals user.Id
            where !teacher.IsDeleted && user.Role == UserRole.Teacher
            select new { teacher, user };

        if (schoolId is not null)
        {
            query = query.Where(row => row.teacher.SchoolId == schoolId.Value);
        }

        if (campusId is not null)
        {
            query = query.Where(row => row.teacher.CampusId == campusId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(row =>
                row.user.FullName.Contains(term)
                || row.user.Username.Contains(term)
                || row.teacher.TeacherCode.Contains(term));
        }

        return await query
            .OrderBy(row => row.user.FullName)
            .Select(row => new DirectoryTeacherResponse(
                row.teacher.Id,
                row.user.FullName,
                row.user.Username,
                row.teacher.TeacherCode,
                row.teacher.SchoolId,
                row.teacher.CampusId,
                row.user.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<DirectoryParentResponse>> ListParentsAsync(
        string? search,
        CancellationToken cancellationToken)
    {
        var query =
            from parent in _dbContext.Parents.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on parent.Id equals user.Id
            where !parent.IsDeleted && user.Role == UserRole.Parent
            select new { parent, user };

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(row =>
                row.user.FullName.Contains(term) || row.user.Username.Contains(term));
        }

        var rows = await query.OrderBy(row => row.user.FullName).ToListAsync(cancellationToken);
        if (rows.Count == 0)
        {
            return Array.Empty<DirectoryParentResponse>();
        }

        var parentIds = rows.Select(row => row.parent.Id).ToArray();
        var linkCounts = await _dbContext.ParentStudentRelations.AsNoTracking()
            .Where(relation => parentIds.Contains(relation.ParentId) && relation.IsActive)
            .GroupBy(relation => relation.ParentId)
            .Select(group => new { ParentId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.ParentId, item => item.Count, cancellationToken);

        return rows.Select(row => new DirectoryParentResponse(
            row.parent.Id,
            row.user.FullName,
            row.user.Username,
            linkCounts.GetValueOrDefault(row.parent.Id),
            row.user.IsActive)).ToArray();
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
            .AnyAsync(parent => parent.Id == parentId && !parent.IsDeleted, cancellationToken);
    }

    public Task<bool> StudentExistsAsync(long studentId, CancellationToken cancellationToken)
    {
        return _dbContext.Students.AsNoTracking()
            .AnyAsync(student => student.Id == studentId && !student.IsDeleted, cancellationToken);
    }
}
