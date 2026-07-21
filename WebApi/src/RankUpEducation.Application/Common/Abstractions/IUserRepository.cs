using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>Persistence for users, roles, registration approvals, refresh tokens, and role profiles.</summary>
public interface IUserRepository
{
    Task<User?> GetByIdAsync(long id, CancellationToken cancellationToken);

    /// <summary>Loads the user with role-specific profile context for session mapping.</summary>
    Task<User?> GetByIdForRoleAsync(long id, UserRole activeRole, CancellationToken cancellationToken);

    Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken);

    /// <summary>Resolves login by username, CNIC, or mobile number (in that priority).</summary>
    Task<User?> GetByLoginIdentifierAsync(string identifier, CancellationToken cancellationToken);

    Task<User?> GetByMobileNumberAsync(string mobileNumber, CancellationToken cancellationToken);

    Task<User?> GetByCnicAsync(string cnic, CancellationToken cancellationToken);

    Task<RefreshToken?> GetRefreshTokenByHashAsync(string tokenHash, CancellationToken cancellationToken);

    /// <summary>True when a non-rejected row already uses the username.</summary>
    Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken);

    Task<bool> CnicExistsAsync(string cnic, CancellationToken cancellationToken);

    Task<bool> MobileNumberExistsAsync(string mobileNumber, CancellationToken cancellationToken);

    Task AddAsync(User user, CancellationToken cancellationToken);

    /// <summary>Pending self-registrations scoped by the reviewer's school/campus when provided.</summary>
    Task<IReadOnlyList<User>> ListPendingRegistrationsAsync(
        int take,
        int? schoolIdFilter,
        int? campusIdFilter,
        CancellationToken cancellationToken);

    /// <summary>
    /// Eligible reviewers from school/campus scope (written into app_user_approval):
    /// no school → PortalAdmin;
    /// school only → SchoolAdmin + PortalAdmin;
    /// campus → CampusAdmin + SchoolAdmin + PortalAdmin.
    /// </summary>
    Task<IReadOnlyList<PendingApproverCandidate>> ListPendingApproverCandidatesAsync(
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

    Task<UserApproval?> GetApprovalAsync(
        long userId,
        long approverUserId,
        UserRole approverRole,
        CancellationToken cancellationToken);

    Task<bool> HasApprovedAsync(
        long userId,
        long approverUserId,
        UserRole approverRole,
        CancellationToken cancellationToken);

    Task<bool> HasStudentProfileAsync(long userId, CancellationToken cancellationToken);

    Task<bool> HasTeacherProfileAsync(long userId, CancellationToken cancellationToken);

    Task<bool> HasParentProfileAsync(long userId, CancellationToken cancellationToken);

    /// <summary>Creates the student profile when Portal Admin activates a registration.</summary>
    Task AddStudentProfileAsync(Domain.Students.Student student, CancellationToken cancellationToken);

    Task AddTeacherProfileAsync(Domain.Teachers.Teacher teacher, CancellationToken cancellationToken);

    Task AddParentProfileAsync(Domain.Parents.Parent parent, CancellationToken cancellationToken);

    Task DeleteAsync(User user, CancellationToken cancellationToken);

    /// <summary>Revokes all active refresh tokens (logout all sessions, school-change lock, password clear).</summary>
    Task RevokeRefreshTokensForUserAsync(
        long userId,
        DateTimeOffset revokedAt,
        CancellationToken cancellationToken);

    /// <summary>Persists <c>app_users.last_login_at</c> after a successful password login.</summary>
    Task UpdateLastLoginAtAsync(
        long userId,
        DateTimeOffset loginAt,
        CancellationToken cancellationToken);
}
