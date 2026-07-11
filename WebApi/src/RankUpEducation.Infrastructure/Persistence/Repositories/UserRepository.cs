using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Parents;
using RankUpEducation.Domain.Students;
using RankUpEducation.Domain.Teachers;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

public sealed class UserRepository : IUserRepository
{
    private readonly RankUpDbContext _dbContext;

    public UserRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<User?> GetByIdAsync(long id, CancellationToken cancellationToken)
    {
        return WithProfileContextAsync(
            UsersWithRoles().FirstOrDefaultAsync(user => user.Id == id, cancellationToken),
            activeRole: null,
            cancellationToken);
    }

    public Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken)
    {
        return WithProfileContextAsync(
            UsersWithRoles().FirstOrDefaultAsync(user => user.Username.ToLower() == username.ToLower(), cancellationToken),
            activeRole: null,
            cancellationToken);
    }

    public async Task<User?> GetByLoginIdentifierAsync(string identifier, CancellationToken cancellationToken)
    {
        var normalized = identifier.AsLowercase();

        // Priority: username → CNIC → mobile number.
        var byUsername = await UsersWithRoles()
            .FirstOrDefaultAsync(user => user.Username.ToLower() == normalized, cancellationToken);
        if (byUsername is not null)
        {
            return await WithProfileContextAsync(Task.FromResult<User?>(byUsername), null, cancellationToken);
        }

        var byCnic = await UsersWithRoles()
            .FirstOrDefaultAsync(
                user => user.Cnic != null && user.Cnic.ToLower() == normalized,
                cancellationToken);
        if (byCnic is not null)
        {
            return await WithProfileContextAsync(Task.FromResult<User?>(byCnic), null, cancellationToken);
        }

        var byMobile = await UsersWithRoles()
            .FirstOrDefaultAsync(
                user => user.MobileNumber != null && user.MobileNumber.ToLower() == normalized,
                cancellationToken);
        return await WithProfileContextAsync(Task.FromResult(byMobile), null, cancellationToken);
    }

    public Task<User?> GetByMobileNumberAsync(string mobileNumber, CancellationToken cancellationToken)
    {
        var normalized = mobileNumber.AsTrimmedString().ToLowerInvariant();
        return WithProfileContextAsync(
            UsersWithRoles().FirstOrDefaultAsync(
                user => user.MobileNumber != null && user.MobileNumber.ToLower() == normalized,
                cancellationToken),
            activeRole: null,
            cancellationToken);
    }

    public Task<User?> GetByCnicAsync(string cnic, CancellationToken cancellationToken)
    {
        var normalized = cnic.AsTrimmedString().ToLowerInvariant();
        return WithProfileContextAsync(
            UsersWithRoles().FirstOrDefaultAsync(
                user => user.Cnic != null && user.Cnic.ToLower() == normalized,
                cancellationToken),
            activeRole: null,
            cancellationToken);
    }

    public Task<User?> GetByIdForRoleAsync(long id, UserRole activeRole, CancellationToken cancellationToken)
    {
        return WithProfileContextAsync(
            UsersWithRoles().FirstOrDefaultAsync(user => user.Id == id, cancellationToken),
            activeRole,
            cancellationToken);
    }

    public Task<RefreshToken?> GetRefreshTokenByHashAsync(string tokenHash, CancellationToken cancellationToken)
    {
        return _dbContext.RefreshTokens.FirstOrDefaultAsync(token => token.TokenHash == tokenHash, cancellationToken);
    }

    public Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken)
    {
        return _dbContext.Users.AnyAsync(user => user.Username.ToLower() == username.ToLower(), cancellationToken);
    }

    public Task<bool> CnicExistsAsync(string cnic, CancellationToken cancellationToken)
    {
        var normalized = cnic.AsTrimmedString();
        return _dbContext.Users.AnyAsync(
            user => user.Cnic != null && user.Cnic.ToLower() == normalized.ToLower(),
            cancellationToken);
    }

    public Task<bool> MobileNumberExistsAsync(string mobileNumber, CancellationToken cancellationToken)
    {
        var normalized = mobileNumber.AsTrimmedString();
        return _dbContext.Users.AnyAsync(
            user => user.MobileNumber != null && user.MobileNumber.ToLower() == normalized.ToLower(),
            cancellationToken);
    }

    public async Task AddAsync(User user, CancellationToken cancellationToken)
    {
        await _dbContext.Users.AddAsync(user, cancellationToken);
    }

    public async Task<IReadOnlyList<User>> ListPendingRegistrationsAsync(
        int take,
        int? schoolIdFilter,
        int? campusIdFilter,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Users.AsNoTracking()
            .Where(user => !user.IsActive && (user.PasswordHash == null || user.PasswordHash == ""));

        if (campusIdFilter.HasValue)
        {
            // Campus Admin: school-target requests for their campus only.
            query = query.Where(user =>
                user.CampusId == campusIdFilter.Value
                && user.AdminTarget == "School Admin");

            if (schoolIdFilter.HasValue)
            {
                query = query.Where(user => user.SchoolId == schoolIdFilter.Value);
            }
        }
        else if (schoolIdFilter.HasValue)
        {
            // School Admin: only "School Admin" target requests for their school.
            query = query.Where(user =>
                user.SchoolId == schoolIdFilter.Value
                && user.AdminTarget == "School Admin");
        }

        return await query
            .OrderByDescending(user => user.RequestedAt)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<long>> ListAdminRecipientsAsync(
        string? adminTarget,
        int? schoolId,
        int? campusId,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Users.AsNoTracking()
            .Where(user => user.IsActive && user.PasswordHash != null);

        var isSchoolAdminTarget = string.Equals(adminTarget, "School Admin", StringComparison.OrdinalIgnoreCase)
            && schoolId.HasValue;

        if (isSchoolAdminTarget)
        {
            query = query.Where(user =>
                user.RoleAssignments.Any(assignment => assignment.Role == UserRole.PortalAdmin)
                || (user.RoleAssignments.Any(assignment => assignment.Role == UserRole.SchoolAdmin)
                    && user.SchoolId == schoolId!.Value)
                || (user.RoleAssignments.Any(assignment => assignment.Role == UserRole.CampusAdmin)
                    && user.SchoolId == schoolId!.Value
                    && (!campusId.HasValue || user.CampusId == campusId.Value)));
        }
        else
        {
            query = query.Where(user =>
                user.RoleAssignments.Any(assignment => assignment.Role == UserRole.PortalAdmin));
        }

        return await query
            .Select(user => user.Id)
            .Distinct()
            .ToListAsync(cancellationToken);
    }

    public Task<bool> HasStudentProfileAsync(long userId, CancellationToken cancellationToken)
    {
        return _dbContext.Students.AnyAsync(student => student.Id == userId, cancellationToken);
    }

    public Task<bool> HasTeacherProfileAsync(long userId, CancellationToken cancellationToken)
    {
        return _dbContext.Teachers.AnyAsync(teacher => teacher.Id == userId, cancellationToken);
    }

    public Task<bool> HasParentProfileAsync(long userId, CancellationToken cancellationToken)
    {
        return _dbContext.Parents.AnyAsync(parent => parent.Id == userId, cancellationToken);
    }

    public async Task AddStudentProfileAsync(Student student, CancellationToken cancellationToken)
    {
        await _dbContext.Students.AddAsync(student, cancellationToken);
    }

    public async Task AddTeacherProfileAsync(Teacher teacher, CancellationToken cancellationToken)
    {
        await _dbContext.Teachers.AddAsync(teacher, cancellationToken);
    }

    public async Task AddParentProfileAsync(Parent parent, CancellationToken cancellationToken)
    {
        await _dbContext.Parents.AddAsync(parent, cancellationToken);
    }

    public Task DeleteAsync(User user, CancellationToken cancellationToken)
    {
        _dbContext.Users.Remove(user);
        return Task.CompletedTask;
    }

    private IQueryable<User> UsersWithRoles()
        => _dbContext.Users.Include(user => user.RoleAssignments);

    private async Task<User?> WithProfileContextAsync(
        Task<User?> userTask,
        UserRole? activeRole,
        CancellationToken cancellationToken)
    {
        var user = await userTask;
        if (user is null)
        {
            return null;
        }

        var role = activeRole ?? user.Role;
        if (!user.HasRole(role))
        {
            role = user.Role;
        }

        switch (role)
        {
            case UserRole.Student:
                var student = await _dbContext.Students.FirstOrDefaultAsync(profile => profile.Id == user.Id, cancellationToken);
                user.AttachProfileContext(student?.Id, user.SchoolId, user.CampusId);
                break;
            case UserRole.Teacher:
                var teacher = await _dbContext.Teachers.FirstOrDefaultAsync(profile => profile.Id == user.Id, cancellationToken);
                user.AttachProfileContext(teacher?.Id, user.SchoolId, user.CampusId);
                break;
            case UserRole.Parent:
                var parent = await _dbContext.Parents.FirstOrDefaultAsync(profile => profile.Id == user.Id, cancellationToken);
                user.AttachProfileContext(parent?.Id, user.SchoolId, user.CampusId);
                break;
            case UserRole.PortalAdmin:
            case UserRole.SchoolAdmin:
            case UserRole.CampusAdmin:
                user.AttachProfileContext(user.Id, user.SchoolId, user.CampusId);
                break;
        }

        return user;
    }
}
