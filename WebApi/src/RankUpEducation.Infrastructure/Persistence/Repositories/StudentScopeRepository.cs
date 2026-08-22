using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Directory;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

public sealed class StudentScopeRepository : IStudentScopeRepository
{
    private readonly RankUpDbContext _dbContext;

    public StudentScopeRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<long>> GetLinkedStudentIdsAsync(long parentId, CancellationToken cancellationToken)
    {
        return await _dbContext.ParentStudentRelations.AsNoTracking()
            .Where(relation => relation.ParentId == parentId && relation.IsActive)
            .Select(relation => relation.StudentId)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<LinkedStudentInfo>> GetLinkedStudentsAsync(
        long parentId,
        CancellationToken cancellationToken)
    {
        var rows = await (
            from relation in _dbContext.ParentStudentRelations.AsNoTracking()
            join student in _dbContext.Students.AsNoTracking() on relation.StudentId equals student.Id
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            join school in _dbContext.Schools.AsNoTracking() on (long?)user.SchoolId equals school.Id into schools
            from school in schools.DefaultIfEmpty()
            join campus in _dbContext.Campuses.AsNoTracking() on (long?)user.CampusId equals campus.Id into campuses
            from campus in campuses.DefaultIfEmpty()
            where relation.ParentId == parentId && relation.IsActive
            orderby user.FullName
            select new
            {
                student.Id,
                user.FullName,
                user.Username,
                RollNumber = user.RollNumberTeacherCode ?? string.Empty,
                student.Grade,
                student.Section,
                relation.Relationship,
                SchoolName = school != null ? school.Name : null,
                CampusName = campus != null ? campus.Name : null,
                user.IsActive,
                HasPassword = user.PasswordHash != null && user.PasswordHash != "",
                IsRejected = user.RejectedAt != null,
            })
            .ToListAsync(cancellationToken);

        if (rows.Count == 0)
        {
            return Array.Empty<LinkedStudentInfo>();
        }

        var lockedSet = await GetLockedUserIdsAsync(
            rows.Select(row => row.Id).ToArray(),
            cancellationToken);

        return rows
            .Select(row => new LinkedStudentInfo(
                row.Id,
                row.FullName,
                row.Username,
                row.RollNumber,
                row.Grade,
                row.Section,
                row.Relationship,
                row.SchoolName,
                row.CampusName,
                row.IsActive,
                DirectoryAccountStatuses.Resolve(
                    row.IsActive,
                    row.HasPassword,
                    row.IsRejected,
                    lockedSet.Contains(row.Id))))
            .ToArray();
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

    public async Task<StudentSchoolContext?> GetStudentSchoolContextAsync(long studentId, CancellationToken cancellationToken)
    {
        return await (
            from student in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            where student.Id == studentId
            select new StudentSchoolContext(user.SchoolId, user.CampusId, student.Grade, student.Section))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<StudentMeClassInfo?> GetStudentMeClassAsync(
        long studentId,
        CancellationToken cancellationToken)
    {
        return await (
            from student in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            join school in _dbContext.Schools.AsNoTracking() on (long?)user.SchoolId equals school.Id into schools
            from school in schools.DefaultIfEmpty()
            join campus in _dbContext.Campuses.AsNoTracking() on (long?)user.CampusId equals campus.Id into campuses
            from campus in campuses.DefaultIfEmpty()
            where student.Id == studentId
            select new StudentMeClassInfo(
                user.FullName,
                user.Username,
                user.RollNumberTeacherCode ?? string.Empty,
                student.Grade,
                student.Section,
                school != null ? school.Name : null,
                campus != null ? campus.Name : null))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<long>> GetLinkedParentIdsAsync(
        long studentId,
        CancellationToken cancellationToken)
    {
        return await _dbContext.ParentStudentRelations.AsNoTracking()
            .Where(relation => relation.StudentId == studentId && relation.IsActive)
            .Select(relation => relation.ParentId)
            .ToListAsync(cancellationToken);
    }

    public Task<bool> IsLinkedStudentAsync(long parentId, long studentId, CancellationToken cancellationToken)
    {
        return _dbContext.ParentStudentRelations.AsNoTracking()
            .AnyAsync(
                relation => relation.ParentId == parentId
                    && relation.StudentId == studentId
                    && relation.IsActive,
                cancellationToken);
    }

    public Task<bool> IsStudentInSchoolAsync(
        long studentId,
        int schoolId,
        int campusId,
        CancellationToken cancellationToken)
    {
        return (
            from student in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            where student.Id == studentId
                && user.SchoolId == schoolId
                && user.CampusId == campusId
            select student.Id)
            .AnyAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<long>> GetStudentIdsInSchoolByGradeAsync(
        int schoolId,
        int campusId,
        short gradeId,
        CancellationToken cancellationToken)
    {
        return await (
            from student in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            where user.SchoolId == schoolId
                && user.CampusId == campusId
                && student.Grade == gradeId
            select student.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<long>> GetStudentIdsInCampusByGradeAndSectionAsync(
        int schoolId,
        int campusId,
        short gradeId,
        string section,
        CancellationToken cancellationToken)
    {
        var normalized = section.Trim();
        return await (
            from student in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            where user.SchoolId == schoolId
                && user.CampusId == campusId
                && student.Grade == gradeId
                && student.Section == normalized
            select student.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<long>> GetStudentIdsInSchoolAsync(
        int schoolId,
        CancellationToken cancellationToken,
        int? campusId = null,
        short? gradeId = null)
    {
        var query =
            from student in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            where user.SchoolId == schoolId
            select new { student.Id, user.CampusId, student.Grade };

        if (campusId is > 0)
        {
            query = query.Where(row => row.CampusId == campusId.Value);
        }

        if (gradeId is > 0)
        {
            query = query.Where(row => row.Grade == gradeId.Value);
        }

        return await query.Select(row => row.Id).ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<long>> GetStudentIdsInSchoolsAsync(
        IReadOnlyList<int> schoolIds,
        CancellationToken cancellationToken)
    {
        if (schoolIds.Count == 0)
        {
            return Array.Empty<long>();
        }

        return await (
            from student in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            where user.SchoolId != null && schoolIds.Contains(user.SchoolId.Value)
            select student.Id)
            .Distinct()
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<long>> GetGroupMemberStudentIdsAsync(
        long groupId,
        long ownerUserId,
        UserRole creatorRole,
        CancellationToken cancellationToken)
    {
        var groupExists = await _dbContext.StudentGroups.AsNoTracking()
            .AnyAsync(
                group => group.Id == groupId
                    && group.ReferralId == ownerUserId
                    && group.CreatorRole == creatorRole
                    && group.IsActive,
                cancellationToken);

        if (!groupExists)
        {
            return Array.Empty<long>();
        }

        return await _dbContext.StudentGroupMembers.AsNoTracking()
            .Where(member => member.StudentGroupId == groupId)
            .Select(member => member.StudentId)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<long>> GetTeacherRosterStudentIdsAsync(
        long teacherId,
        int schoolId,
        int campusId,
        CancellationToken cancellationToken)
    {
        var assignments = await _dbContext.TeacherClassSections.AsNoTracking()
            .Where(item => item.TeacherId == teacherId && item.IsActive)
            .Select(item => new { item.Grade, item.Section })
            .ToListAsync(cancellationToken);

        if (assignments.Count == 0)
        {
            return Array.Empty<long>();
        }

        var allowed = assignments
            .Select(item => (item.Grade, Section: item.Section.ToLowerInvariant()))
            .ToHashSet();
        var grades = allowed.Select(item => item.Grade).Distinct().ToArray();
        var sections = allowed.Select(item => item.Section).Distinct().ToArray();

        var candidates = await (
            from student in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            where user.SchoolId == schoolId
                && user.CampusId == campusId
                && user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Student)
                && grades.Contains(student.Grade)
                && sections.Contains(student.Section.ToLower())
            select new { student.Id, student.Grade, student.Section })
            .ToListAsync(cancellationToken);

        return candidates
            .Where(row => allowed.Contains((row.Grade, row.Section.ToLowerInvariant())))
            .Select(row => row.Id)
            .Distinct()
            .ToArray();
    }

    public async Task<bool> IsStudentInTeacherRosterAsync(
        long teacherId,
        long studentId,
        int schoolId,
        int campusId,
        CancellationToken cancellationToken)
    {
        var roster = await GetTeacherRosterStudentIdsAsync(
            teacherId,
            schoolId,
            campusId,
            cancellationToken);
        return roster.Contains(studentId);
    }
}
