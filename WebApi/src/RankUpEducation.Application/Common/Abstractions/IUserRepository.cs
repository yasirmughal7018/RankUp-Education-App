using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Common.Abstractions;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(long id, CancellationToken cancellationToken);

    Task<User?> GetByIdForRoleAsync(long id, UserRole activeRole, CancellationToken cancellationToken);

    Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken);

    /// <summary>Resolves login by username, CNIC, or mobile number (in that priority).</summary>
    Task<User?> GetByLoginIdentifierAsync(string identifier, CancellationToken cancellationToken);

    Task<User?> GetByMobileNumberAsync(string mobileNumber, CancellationToken cancellationToken);

    Task<User?> GetByCnicAsync(string cnic, CancellationToken cancellationToken);

    Task<RefreshToken?> GetRefreshTokenByHashAsync(string tokenHash, CancellationToken cancellationToken);

    Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken);

    Task<bool> CnicExistsAsync(string cnic, CancellationToken cancellationToken);

    Task<bool> MobileNumberExistsAsync(string mobileNumber, CancellationToken cancellationToken);

    Task AddAsync(User user, CancellationToken cancellationToken);

    Task<IReadOnlyList<User>> ListPendingRegistrationsAsync(
        int take,
        int? schoolIdFilter,
        int? campusIdFilter,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<long>> ListAdminRecipientsAsync(
        string? adminTarget,
        int? schoolId,
        int? campusId,
        CancellationToken cancellationToken);

    /// <summary>
    /// Active Portal / School / Campus admins who can review registrations,
    /// with the role they would use for this target scope.
    /// </summary>
    Task<IReadOnlyList<PendingApproverCandidate>> ListPendingApproverCandidatesAsync(
        string? adminTarget,
        int? schoolId,
        int? campusId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<PendingApproverCandidate>> ListPendingApproversForUserAsync(
        long userId,
        CancellationToken cancellationToken);

    Task AddApprovalAsync(UserApproval approval, CancellationToken cancellationToken);

    Task AddApprovalsAsync(IEnumerable<UserApproval> approvals, CancellationToken cancellationToken);

    Task<UserApproval?> GetPendingApprovalAsync(
        long userId,
        long approverUserId,
        UserRole approverRole,
        CancellationToken cancellationToken);

    Task<bool> HasStudentProfileAsync(long userId, CancellationToken cancellationToken);

    Task<bool> HasTeacherProfileAsync(long userId, CancellationToken cancellationToken);

    Task<bool> HasParentProfileAsync(long userId, CancellationToken cancellationToken);

    Task AddStudentProfileAsync(Domain.Students.Student student, CancellationToken cancellationToken);

    Task AddTeacherProfileAsync(Domain.Teachers.Teacher teacher, CancellationToken cancellationToken);

    Task AddParentProfileAsync(Domain.Parents.Parent parent, CancellationToken cancellationToken);

    Task DeleteAsync(User user, CancellationToken cancellationToken);
}
