using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
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
        return WithProfileContextAsync(_dbContext.Users
            .FirstOrDefaultAsync(user => user.Id == id, cancellationToken), cancellationToken);
    }

    public Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken)
    {
        return WithProfileContextAsync(_dbContext.Users
            .FirstOrDefaultAsync(user => user.Username.ToLower() == username.ToLower(), cancellationToken), cancellationToken);
    }

    public Task<RefreshToken?> GetRefreshTokenByHashAsync(string tokenHash, CancellationToken cancellationToken)
    {
        return _dbContext.RefreshTokens.FirstOrDefaultAsync(token => token.TokenHash == tokenHash, cancellationToken);
    }

    public Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken)
    {
        return _dbContext.Users.AnyAsync(user => user.Username.ToLower() == username.ToLower(), cancellationToken);
    }

    public async Task AddAsync(User user, CancellationToken cancellationToken)
    {
        await _dbContext.Users.AddAsync(user, cancellationToken);
    }

    public async Task<IReadOnlyList<User>> ListPendingRegistrationsAsync(int take, CancellationToken cancellationToken)
    {
        return await _dbContext.Users.AsNoTracking()
            .Where(user => !user.IsActive && user.PasswordHash == null)
            .OrderByDescending(user => user.RequestedAt)
            .Take(take)
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

    private async Task<User?> WithProfileContextAsync(Task<User?> userTask, CancellationToken cancellationToken)
    {
        var user = await userTask;
        if (user is null)
        {
            return null;
        }

        switch (user.Role)
        {
            case UserRole.Student:
                var student = await _dbContext.Students.FirstOrDefaultAsync(profile => profile.Id == user.Id, cancellationToken);
                user.AttachProfileContext(student?.Id, student?.SchoolId, student?.CampusId);
                break;
            case UserRole.Teacher:
                var teacher = await _dbContext.Teachers.FirstOrDefaultAsync(profile => profile.Id == user.Id, cancellationToken);
                user.AttachProfileContext(teacher?.Id, teacher?.SchoolId, teacher?.CampusId);
                break;
            case UserRole.Parent:
                var parent = await _dbContext.Parents.FirstOrDefaultAsync(profile => profile.Id == user.Id, cancellationToken);
                user.AttachProfileContext(parent?.Id, null, null);
                break;
            case UserRole.SuperAdmin:
            case UserRole.SchoolAdmin:
                user.AttachProfileContext(user.Id, null, null);
                break;
        }

        return user;
    }
}
