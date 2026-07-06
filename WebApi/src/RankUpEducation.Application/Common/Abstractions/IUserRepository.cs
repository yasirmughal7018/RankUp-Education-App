using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Common.Abstractions;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(long id, CancellationToken cancellationToken);

    Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken);

    Task<RefreshToken?> GetRefreshTokenByHashAsync(string tokenHash, CancellationToken cancellationToken);

    Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken);

    Task AddAsync(User user, CancellationToken cancellationToken);

    Task<IReadOnlyList<User>> ListPendingRegistrationsAsync(int take, CancellationToken cancellationToken);

    Task<bool> HasStudentProfileAsync(long userId, CancellationToken cancellationToken);

    Task<bool> HasTeacherProfileAsync(long userId, CancellationToken cancellationToken);

    Task<bool> HasParentProfileAsync(long userId, CancellationToken cancellationToken);

    Task AddStudentProfileAsync(Domain.Students.Student student, CancellationToken cancellationToken);

    Task AddTeacherProfileAsync(Domain.Teachers.Teacher teacher, CancellationToken cancellationToken);

    Task AddParentProfileAsync(Domain.Parents.Parent parent, CancellationToken cancellationToken);

    Task DeleteAsync(User user, CancellationToken cancellationToken);
}
