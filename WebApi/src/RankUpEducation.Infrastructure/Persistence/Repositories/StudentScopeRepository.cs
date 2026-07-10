using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Quizzes;

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
        return await (
            from relation in _dbContext.ParentStudentRelations.AsNoTracking()
            join student in _dbContext.Students.AsNoTracking() on relation.StudentId equals student.Id
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            where relation.ParentId == parentId && relation.IsActive
            orderby user.FullName
            select new LinkedStudentInfo(
                student.Id,
                user.FullName,
                user.RollNumberTeacherCode ?? string.Empty,
                student.Grade,
                student.Section,
                relation.Relationship))
            .ToListAsync(cancellationToken);
    }

    public async Task<StudentSchoolContext?> GetStudentSchoolContextAsync(long studentId, CancellationToken cancellationToken)
    {
        return await (
            from student in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            where student.Id == studentId
            select new StudentSchoolContext(user.SchoolId ?? 0, user.CampusId ?? 0, student.Grade))
            .FirstOrDefaultAsync(cancellationToken);
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

    public async Task<IReadOnlyList<long>> GetGroupMemberStudentIdsAsync(
        long groupId,
        long ownerUserId,
        string creatorRole,
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
}
