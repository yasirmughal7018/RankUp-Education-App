using RankUpEducation.Contracts.Auth;

namespace RankUpEducation.Application.Auth;

/// <summary>
/// Authentication and account lifecycle operations exposed to the API layer.
/// </summary>
public interface IAuthService
{
    /// <summary>Authenticates with CNIC/mobile and password; returns tokens and user profile.</summary>
    Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken);

    /// <summary>Re-issues tokens for an already authenticated user under a different assigned role.</summary>
    Task<LoginResponse> SwitchRoleAsync(SwitchRoleRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// Checks whether the account is pending, needs first password, or can sign in.
    /// </summary>
    Task<LoginStatusResponse> GetLoginStatusAsync(
        LoginStatusRequest request,
        CancellationToken cancellationToken);

    /// <summary>
    /// First visit after approval: set password only (no session). User must sign in afterward.
    /// </summary>
    Task SetInitialPasswordAsync(
        SetInitialPasswordRequest request,
        CancellationToken cancellationToken);

    /// <summary>Submits a self-registration request for Student, Parent, or Teacher.</summary>
    Task<RegisterAccountResponse> RegisterAccountAsync(RegisterAccountRequest request, CancellationToken cancellationToken);

    /// <summary>Lists pending registration requests visible to the signed-in admin's scope.</summary>
    Task<IReadOnlyList<PendingRegistrationResponse>> ListPendingRegistrationsAsync(int take, CancellationToken cancellationToken);

    /// <summary>Records admin approval; Portal Admin activation creates the role profile.</summary>
    Task<ApproveRegistrationResponse> ApproveRegistrationAsync(long userId, CancellationToken cancellationToken);

    /// <summary>Soft-rejects a pending registration while retaining audit history.</summary>
    Task RejectRegistrationAsync(long userId, CancellationToken cancellationToken);

    /// <summary>Notifies eligible admins to clear the user's password (does not reveal account existence).</summary>
    Task RequestPasswordResetAsync(PasswordResetRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// Admin clears the user's password after a forgot-password request so they can set a new one on login.
    /// </summary>
    Task ClearPasswordForResetAsync(PasswordResetRequest request, CancellationToken cancellationToken);

    /// <summary>Exchanges a valid refresh token for a new access/refresh pair.</summary>
    Task<AuthTokensResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken);

    /// <summary>Returns the signed-in user's profile, permissions, and pending school-change state.</summary>
    Task<CurrentUserResponse> GetCurrentUserAsync(CancellationToken cancellationToken);

    /// <summary>Self-service update of display name and contact fields (not school/campus).</summary>
    Task<CurrentUserResponse> UpdateProfileAsync(
        UpdateProfileRequest request,
        CancellationToken cancellationToken);

    /// <summary>Queues a school/campus transfer and locks the account until admins resolve it.</summary>
    Task<RequestSchoolChangeResponse> RequestSchoolChangeAsync(
        RequestSchoolChangeRequest request,
        CancellationToken cancellationToken);

    /// <summary>Stores a profile avatar image and returns the updated user profile.</summary>
    Task<CurrentUserResponse> UploadAvatarAsync(
        Stream content,
        string fileName,
        string contentType,
        CancellationToken cancellationToken);

    /// <summary>Self-deactivates the account after verifying the current password.</summary>
    Task DeactivateAccountAsync(
        DeactivateAccountRequest request,
        CancellationToken cancellationToken);

    /// <summary>Lists pending school-change requests visible to the signed-in admin's scope.</summary>
    Task<IReadOnlyList<PendingSchoolChangeResponse>> ListPendingSchoolChangesAsync(
        int take,
        CancellationToken cancellationToken);

    /// <summary>Records approval and applies the transfer when the approver may finalize it.</summary>
    Task<ApproveSchoolChangeResponse> ApproveSchoolChangeAsync(
        long requestId,
        CancellationToken cancellationToken);

    /// <summary>Rejects a pending school-change request and unlocks the account.</summary>
    Task RejectSchoolChangeAsync(
        long requestId,
        CancellationToken cancellationToken);

    /// <summary>Changes password for a signed-in user, or completes first-time setup.</summary>
    Task<CurrentUserResponse> ChangePasswordAsync(
        ChangePasswordRequest request,
        CancellationToken cancellationToken);

    /// <summary>Revokes the supplied refresh token when present (idempotent).</summary>
    Task LogoutAsync(RefreshTokenRequest? request, CancellationToken cancellationToken);
}
