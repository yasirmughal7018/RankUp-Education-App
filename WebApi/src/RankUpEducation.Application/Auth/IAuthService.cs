using RankUpEducation.Contracts.Auth;

namespace RankUpEducation.Application.Auth;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken);

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

    Task<RegisterAccountResponse> RegisterAccountAsync(RegisterAccountRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyList<PendingRegistrationResponse>> ListPendingRegistrationsAsync(int take, CancellationToken cancellationToken);

    Task<ApproveRegistrationResponse> ApproveRegistrationAsync(long userId, CancellationToken cancellationToken);

    Task RejectRegistrationAsync(long userId, CancellationToken cancellationToken);

    Task RequestPasswordResetAsync(PasswordResetRequest request, CancellationToken cancellationToken);

    Task<AuthTokensResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken);

    Task<CurrentUserResponse> GetCurrentUserAsync(CancellationToken cancellationToken);

    Task<CurrentUserResponse> ChangePasswordAsync(
        ChangePasswordRequest request,
        CancellationToken cancellationToken);

    Task LogoutAsync(RefreshTokenRequest? request, CancellationToken cancellationToken);
}
