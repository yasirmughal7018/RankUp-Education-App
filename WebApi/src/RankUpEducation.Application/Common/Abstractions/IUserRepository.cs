using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Common.Abstractions;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(long id, CancellationToken cancellationToken);

    Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken);

    /// <summary>Resolves login by username, CNIC, or mobile number (in that priority).</summary>
    Task<User?> GetByLoginIdentifierAsync(string identifier, CancellationToken cancellationToken);

    Task<RefreshToken?> GetRefreshTokenByHashAsync(string tokenHash, CancellationToken cancellationToken);

    Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken);

    Task<bool> CnicExistsAsync(string cnic, CancellationToken cancellationToken);

    Task<bool> MobileNumberExistsAsync(string mobileNumber, CancellationToken cancellationToken);

    Task AddAsync(User user, CancellationToken cancellationToken);

    Task<IReadOnlyList<User>> ListPendingRegistrationsAsync(int take, int? schoolIdFilter, CancellationToken cancellationToken);

    Task<IReadOnlyList<long>> ListAdminRecipientsAsync(string? adminTarget, int? schoolId, CancellationToken cancellationToken);

    Task<bool> HasStudentProfileAsync(long userId, CancellationToken cancellationToken);

    Task<bool> HasTeacherProfileAsync(long userId, CancellationToken cancellationToken);

    Task<bool> HasParentProfileAsync(long userId, CancellationToken cancellationToken);

    Task AddStudentProfileAsync(Domain.Students.Student student, CancellationToken cancellationToken);

    Task AddTeacherProfileAsync(Domain.Teachers.Teacher teacher, CancellationToken cancellationToken);

    Task AddParentProfileAsync(Domain.Parents.Parent parent, CancellationToken cancellationToken);

    Task DeleteAsync(User user, CancellationToken cancellationToken);
}
