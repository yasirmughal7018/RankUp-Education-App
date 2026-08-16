using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Directory;
using RankUpEducation.Application.Teachers;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Contracts.Teachers;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Students;
using RankUpEducation.Domain.Teachers;
using RankUpEducation.Infrastructure.Persistence;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

public sealed class TeacherRepository : ITeacherRepository
{
    private readonly RankUpDbContext _dbContext;

    public TeacherRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task ReplaceClassSectionsAsync(
        long teacherId,
        IReadOnlyList<TeacherClassSectionItem> classSections,
        CancellationToken cancellationToken)
    {
        var desired = classSections
            .Where(item => item.Grade > 0 && item.Section.HasTrimmedText())
            .Select(item => new TeacherClassSectionItem(item.Grade, item.Section.AsTrimmedString()))
            .GroupBy(item => (item.Grade, Section: item.Section.ToLowerInvariant()))
            .Select(group => group.First())
            .ToArray();

        var existing = await _dbContext.TeacherClassSections
            .Where(item => item.TeacherId == teacherId)
            .ToListAsync(cancellationToken);

        var desiredKeys = desired
            .Select(item => (item.Grade, Section: item.Section.ToLowerInvariant()))
            .ToHashSet();

        foreach (var row in existing)
        {
            var key = (row.Grade, Section: row.Section.ToLowerInvariant());
            if (desiredKeys.Contains(key))
            {
                row.Activate();
            }
            else
            {
                row.Deactivate();
            }
        }

        foreach (var item in desired)
        {
            if (existing.Any(row =>
                    row.Grade == item.Grade
                    && string.Equals(row.Section, item.Section, StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }

            await _dbContext.TeacherClassSections.AddAsync(
                new TeacherClassSection(teacherId, item.Grade, item.Section),
                cancellationToken);
        }
    }

    public async Task<IReadOnlyList<TeacherClassSectionItem>> GetClassSectionsAsync(
        long teacherId,
        CancellationToken cancellationToken)
    {
        return await _dbContext.TeacherClassSections.AsNoTracking()
            .Where(item => item.TeacherId == teacherId && item.IsActive)
            .OrderBy(item => item.Grade)
            .ThenBy(item => item.Section)
            .Select(item => new TeacherClassSectionItem(item.Grade, item.Section))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyDictionary<long, IReadOnlyList<TeacherClassSectionItem>>> GetClassSectionsByTeacherIdsAsync(
        IReadOnlyList<long> teacherIds,
        CancellationToken cancellationToken)
    {
        if (teacherIds.Count == 0)
        {
            return new Dictionary<long, IReadOnlyList<TeacherClassSectionItem>>();
        }

        var rows = await _dbContext.TeacherClassSections.AsNoTracking()
            .Where(item => teacherIds.Contains(item.TeacherId) && item.IsActive)
            .OrderBy(item => item.Grade)
            .ThenBy(item => item.Section)
            .Select(item => new { item.TeacherId, item.Grade, item.Section })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(row => row.TeacherId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<TeacherClassSectionItem>)group
                    .Select(row => new TeacherClassSectionItem(row.Grade, row.Section))
                    .ToArray());
    }

    public async Task<IReadOnlyList<TeacherRosterStudentResponse>> GetRosterStudentsAsync(
        long teacherId,
        int schoolId,
        int campusId,
        CancellationToken cancellationToken)
    {
        var sections = await GetClassSectionsAsync(teacherId, cancellationToken);
        if (sections.Count == 0)
        {
            return Array.Empty<TeacherRosterStudentResponse>();
        }

        var gradeSet = sections.Select(item => item.Grade).Distinct().ToArray();
        var sectionSet = sections
            .Select(item => item.Section.ToLowerInvariant())
            .Distinct()
            .ToArray();

        var candidates = await (
            from student in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            where user.SchoolId == schoolId
                && user.CampusId == campusId
                && user.IsActive
                && user.RejectedAt == null
                && user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Student)
                && gradeSet.Contains(student.Grade)
                && sectionSet.Contains(student.Section.ToLower())
            orderby student.Grade, student.Section, user.FullName
            select new
            {
                student.Id,
                user.FullName,
                user.Username,
                RollNumber = user.RollNumberTeacherCode ?? string.Empty,
                student.Grade,
                student.Section,
                user.IsActive,
                HasPassword = user.PasswordHash != null && user.PasswordHash != "",
            })
            .ToListAsync(cancellationToken);

        var allowed = sections
            .Select(item => (item.Grade, Section: item.Section.ToLowerInvariant()))
            .ToHashSet();

        return candidates
            .Where(row => allowed.Contains((row.Grade, row.Section.ToLowerInvariant())))
            .Select(row => new TeacherRosterStudentResponse(
                row.Id,
                row.FullName,
                row.Username,
                row.RollNumber,
                row.Grade,
                row.Section,
                row.IsActive,
                DirectoryAccountStatuses.Resolve(
                    row.IsActive,
                    row.HasPassword,
                    isRejected: false,
                    isLockedPendingSchoolChange: false)))
            .ToArray();
    }

    public async Task<IReadOnlyList<TeacherRosterStudentResponse>> GetRosterStudentsByGradesAsync(
        int schoolId,
        int campusId,
        IReadOnlyList<short> grades,
        CancellationToken cancellationToken)
    {
        if (schoolId <= 0 || campusId <= 0 || grades.Count == 0)
        {
            return Array.Empty<TeacherRosterStudentResponse>();
        }

        var gradeSet = grades.Where(grade => grade > 0).Distinct().ToArray();
        if (gradeSet.Length == 0)
        {
            return Array.Empty<TeacherRosterStudentResponse>();
        }

        var rows = await (
            from student in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            where user.SchoolId == schoolId
                && user.CampusId == campusId
                && user.IsActive
                && user.RejectedAt == null
                && user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Student)
                && gradeSet.Contains(student.Grade)
            orderby student.Grade, student.Section, user.FullName
            select new
            {
                student.Id,
                user.FullName,
                user.Username,
                RollNumber = user.RollNumberTeacherCode ?? string.Empty,
                student.Grade,
                student.Section,
                user.IsActive,
                HasPassword = user.PasswordHash != null && user.PasswordHash != "",
            })
            .ToListAsync(cancellationToken);

        return rows
            .Select(row => new TeacherRosterStudentResponse(
                row.Id,
                row.FullName,
                row.Username,
                row.RollNumber,
                row.Grade,
                row.Section,
                row.IsActive,
                DirectoryAccountStatuses.Resolve(
                    row.IsActive,
                    row.HasPassword,
                    isRejected: false,
                    isLockedPendingSchoolChange: false)))
            .ToArray();
    }

    public async Task<bool> IsStudentInRosterAsync(
        long teacherId,
        long studentId,
        int schoolId,
        int campusId,
        CancellationToken cancellationToken)
    {
        var sections = await GetClassSectionsAsync(teacherId, cancellationToken);
        if (sections.Count == 0)
        {
            return false;
        }

        var student = await (
            from row in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on row.Id equals user.Id
            where row.Id == studentId
                && user.SchoolId == schoolId
                && user.CampusId == campusId
                && user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Student)
            select new { row.Grade, row.Section })
            .FirstOrDefaultAsync(cancellationToken);

        if (student is null)
        {
            return false;
        }

        return sections.Any(item =>
            item.Grade == student.Grade
            && string.Equals(item.Section, student.Section, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<IReadOnlyList<StudentGroup>> ListGroupsAsync(
        long ownerUserId,
        UserRole creatorRole,
        CancellationToken cancellationToken)
    {
        // Legacy rows may have null creator_role; treat those as Teacher-owned.
        return await _dbContext.StudentGroups
            .Where(group =>
                group.ReferralId == ownerUserId
                && group.IsActive
                && (group.CreatorRole == creatorRole
                    || (creatorRole == UserRole.Teacher && group.CreatorRole == null)))
            .OrderBy(group => group.GroupName)
            .ToListAsync(cancellationToken);
    }

    public Task<StudentGroup?> GetGroupAsync(
        long groupId,
        long ownerUserId,
        UserRole creatorRole,
        CancellationToken cancellationToken)
    {
        return _dbContext.StudentGroups
            .FirstOrDefaultAsync(
                group => group.Id == groupId
                    && group.ReferralId == ownerUserId
                    && (group.CreatorRole == creatorRole
                        || (creatorRole == UserRole.Teacher && group.CreatorRole == null)),
                cancellationToken);
    }

    public async Task AddGroupAsync(StudentGroup group, CancellationToken cancellationToken)
    {
        await _dbContext.StudentGroups.AddAsync(group, cancellationToken);
    }

    public async Task AddGroupMemberAsync(StudentGroupMember member, CancellationToken cancellationToken)
    {
        await _dbContext.StudentGroupMembers.AddAsync(member, cancellationToken);
    }

    public async Task RemoveGroupMemberAsync(
        long groupId,
        long studentId,
        CancellationToken cancellationToken)
    {
        var member = await _dbContext.StudentGroupMembers
            .FirstOrDefaultAsync(
                item => item.StudentGroupId == groupId && item.StudentId == studentId,
                cancellationToken);
        if (member is not null)
        {
            _dbContext.StudentGroupMembers.Remove(member);
        }
    }

    public Task<bool> IsGroupMemberAsync(
        long groupId,
        long studentId,
        CancellationToken cancellationToken)
    {
        return _dbContext.StudentGroupMembers.AsNoTracking()
            .AnyAsync(
                member => member.StudentGroupId == groupId && member.StudentId == studentId,
                cancellationToken);
    }

    public async Task<IReadOnlyList<TeacherGroupMemberResponse>> GetGroupMembersAsync(
        long groupId,
        CancellationToken cancellationToken)
    {
        return await (
            from member in _dbContext.StudentGroupMembers.AsNoTracking()
            join student in _dbContext.Students.AsNoTracking() on member.StudentId equals student.Id
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            where member.StudentGroupId == groupId
            orderby user.FullName
            select new TeacherGroupMemberResponse(
                student.Id,
                user.FullName,
                user.Username,
                user.RollNumberTeacherCode ?? string.Empty,
                student.Grade,
                student.Section))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyDictionary<long, int>> CountRosterStudentsByTeacherIdsAsync(
        IReadOnlyList<long> teacherIds,
        CancellationToken cancellationToken)
    {
        if (teacherIds.Count == 0)
        {
            return new Dictionary<long, int>();
        }

        var assignments = await _dbContext.TeacherClassSections.AsNoTracking()
            .Where(item => teacherIds.Contains(item.TeacherId) && item.IsActive)
            .Select(item => new { item.TeacherId, item.Grade, item.Section })
            .ToListAsync(cancellationToken);

        if (assignments.Count == 0)
        {
            return teacherIds.ToDictionary(id => id, _ => 0);
        }

        var teachers = await _dbContext.Users.AsNoTracking()
            .Where(user => teacherIds.Contains(user.Id))
            .Select(user => new { user.Id, user.SchoolId, user.CampusId })
            .ToListAsync(cancellationToken);

        var counts = new Dictionary<long, int>();
        foreach (var teacherId in teacherIds)
        {
            counts[teacherId] = 0;
        }

        foreach (var teacher in teachers)
        {
            if (teacher.SchoolId is null || teacher.CampusId is null)
            {
                continue;
            }

            var sections = assignments
                .Where(item => item.TeacherId == teacher.Id)
                .Select(item => (item.Grade, Section: item.Section.ToLowerInvariant()))
                .ToHashSet();

            if (sections.Count == 0)
            {
                continue;
            }

            var grades = sections.Select(item => item.Grade).Distinct().ToArray();
            var sectionNames = sections.Select(item => item.Section).Distinct().ToArray();

            var candidates = await (
                from student in _dbContext.Students.AsNoTracking()
                join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
                where user.SchoolId == teacher.SchoolId
                    && user.CampusId == teacher.CampusId
                    && user.IsActive
                    && user.RejectedAt == null
                    && user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Student)
                    && grades.Contains(student.Grade)
                    && sectionNames.Contains(student.Section.ToLower())
                select new { student.Grade, student.Section })
                .ToListAsync(cancellationToken);

            counts[teacher.Id] = candidates.Count(row =>
                sections.Contains((row.Grade, row.Section.ToLowerInvariant())));
        }

        return counts;
    }

    public async Task<IReadOnlyDictionary<long, IReadOnlyList<string>>> GetTeacherNamesByStudentRosterAsync(
        IReadOnlyList<long> studentIds,
        CancellationToken cancellationToken)
    {
        if (studentIds.Count == 0)
        {
            return new Dictionary<long, IReadOnlyList<string>>();
        }

        var students = await (
            from student in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            where studentIds.Contains(student.Id)
            select new
            {
                student.Id,
                user.SchoolId,
                user.CampusId,
                student.Grade,
                student.Section,
            })
            .ToListAsync(cancellationToken);

        if (students.Count == 0)
        {
            return new Dictionary<long, IReadOnlyList<string>>();
        }

        var schoolIds = students.Where(s => s.SchoolId is not null).Select(s => s.SchoolId!.Value).Distinct().ToArray();
        var campusIds = students.Where(s => s.CampusId is not null).Select(s => s.CampusId!.Value).Distinct().ToArray();
        var grades = students.Select(s => s.Grade).Distinct().ToArray();

        var teachers = await (
            from assignment in _dbContext.TeacherClassSections.AsNoTracking()
            join teacherUser in _dbContext.Users.AsNoTracking() on assignment.TeacherId equals teacherUser.Id
            where assignment.IsActive
                && teacherUser.SchoolId != null
                && teacherUser.CampusId != null
                && schoolIds.Contains(teacherUser.SchoolId.Value)
                && campusIds.Contains(teacherUser.CampusId.Value)
                && grades.Contains(assignment.Grade)
                && teacherUser.RoleAssignments.Any(role => role.Role == UserRole.Teacher)
            select new
            {
                assignment.TeacherId,
                teacherUser.FullName,
                teacherUser.SchoolId,
                teacherUser.CampusId,
                assignment.Grade,
                assignment.Section,
            })
            .ToListAsync(cancellationToken);

        var result = new Dictionary<long, IReadOnlyList<string>>();
        foreach (var student in students)
        {
            if (student.SchoolId is null || student.CampusId is null)
            {
                result[student.Id] = Array.Empty<string>();
                continue;
            }

            var names = teachers
                .Where(teacher =>
                    teacher.SchoolId == student.SchoolId
                    && teacher.CampusId == student.CampusId
                    && teacher.Grade == student.Grade
                    && string.Equals(teacher.Section, student.Section, StringComparison.OrdinalIgnoreCase))
                .Select(teacher => teacher.FullName)
                .Where(name => name.HasTrimmedText())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(name => name)
                .ToArray();

            result[student.Id] = names;
        }

        return result;
    }
}
