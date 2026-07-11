using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RankUpEducation.Application.Auth;
using RankUpEducation.Application.Directory;
using RankUpEducation.Contracts.Auth;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Directory;

namespace RankUpEducation.Api.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("Auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("Login")]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> LoginAsync(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.LoginAsync(request, cancellationToken);
        return Ok(ApiResponse<LoginResponse>.Ok(result, "Login successful."));
    }

    [HttpPost("switch-role")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> SwitchRoleAsync(
        [FromBody] SwitchRoleRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.SwitchRoleAsync(request, cancellationToken);
        return Ok(ApiResponse<LoginResponse>.Ok(result, "Active role updated."));
    }

    /// <summary>
    /// Step 1 of login: check whether the account needs a password or can sign in.
    /// </summary>
    [HttpPost("login-status")]
    [AllowAnonymous]
    [EnableRateLimiting("Login")]
    public async Task<ActionResult<ApiResponse<LoginStatusResponse>>> GetLoginStatusAsync(
        [FromBody] LoginStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.GetLoginStatusAsync(request, cancellationToken);
        return Ok(ApiResponse<LoginStatusResponse>.Ok(result));
    }

    /// <summary>
    /// After admin approval: set password only. User must sign in afterward with that password.
    /// </summary>
    [HttpPost("set-initial-password")]
    [AllowAnonymous]
    [EnableRateLimiting("Login")]
    public async Task<ActionResult<ApiResponse<object?>>> SetInitialPasswordAsync(
        [FromBody] SetInitialPasswordRequest request,
        CancellationToken cancellationToken)
    {
        await _authService.SetInitialPasswordAsync(request, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(
            null,
            "Password set successfully. Sign in with your new password."));
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("UsersAnonymous")]
    public async Task<ActionResult<ApiResponse<RegisterAccountResponse>>> RegisterAsync(
        [FromBody] RegisterAccountRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.RegisterAccountAsync(request, cancellationToken);
        return Ok(ApiResponse<RegisterAccountResponse>.Ok(result, "Registration request sent to admin."));
    }

    [HttpGet("registration-options/schools")]
    [AllowAnonymous]
    [EnableRateLimiting("UsersAnonymous")]
    public async Task<ActionResult<ApiResponse<SchoolListResponse>>> ListRegistrationSchoolsAsync(
        [FromServices] IDirectoryService directoryService,
        CancellationToken cancellationToken)
    {
        var response = await directoryService.ListPublicSchoolsAsync(cancellationToken);
        return Ok(ApiResponse<SchoolListResponse>.Ok(response));
    }

    [HttpGet("registration-options/schools/{schoolId:long}/campuses")]
    [AllowAnonymous]
    [EnableRateLimiting("UsersAnonymous")]
    public async Task<ActionResult<ApiResponse<CampusListResponse>>> ListRegistrationCampusesAsync(
        long schoolId,
        [FromServices] IDirectoryService directoryService,
        CancellationToken cancellationToken)
    {
            var response = await directoryService.ListPublicCampusesAsync(schoolId, cancellationToken);
        return Ok(ApiResponse<CampusListResponse>.Ok(response));
    }

    [HttpGet("registrations/pending")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<PendingRegistrationResponse>>>> ListPendingRegistrationsAsync(
        [FromQuery] int take,
        CancellationToken cancellationToken)
    {
        var result = await _authService.ListPendingRegistrationsAsync(take <= 0 ? 50 : take, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<PendingRegistrationResponse>>.Ok(result));
    }

    [HttpPost("registrations/{userId:long}/approve")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<CurrentUserResponse>>> ApproveRegistrationAsync(
        long userId,
        CancellationToken cancellationToken)
    {
        var result = await _authService.ApproveRegistrationAsync(userId, cancellationToken);
        return Ok(ApiResponse<CurrentUserResponse>.Ok(result, "Registration approved. User must set a password on first login."));
    }

    [HttpPost("registrations/{userId:long}/reject")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> RejectRegistrationAsync(
        long userId,
        CancellationToken cancellationToken)
    {
        await _authService.RejectRegistrationAsync(userId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Registration rejected."));
    }

    [HttpPost("password-reset/request")]
    [AllowAnonymous]
    [EnableRateLimiting("UsersAnonymous")]
    public async Task<ActionResult<ApiResponse<object?>>> RequestPasswordResetAsync(
        [FromBody] PasswordResetRequest request,
        CancellationToken cancellationToken)
    {
        await _authService.RequestPasswordResetAsync(request, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "If the account exists, the school admin has been notified."));
    }

    [HttpPost("token/refresh")]
    [AllowAnonymous]
    [EnableRateLimiting("UsersAnonymous")]
    public async Task<ActionResult<ApiResponse<AuthTokensResponse>>> RefreshTokenAsync(
        [FromBody] RefreshTokenRequest request,
        CancellationToken cancellationToken)
    {
        var tokens = await _authService.RefreshTokenAsync(request, cancellationToken);
        return Ok(ApiResponse<AuthTokensResponse>.Ok(tokens, "Token refreshed successfully."));
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    [EnableRateLimiting("UsersAnonymous")]
    public async Task<ActionResult<ApiResponse<object?>>> LogoutAsync(
        [FromBody] RefreshTokenRequest? request,
        CancellationToken cancellationToken)
    {
        await _authService.LogoutAsync(request, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Logged out successfully."));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<CurrentUserResponse>>> GetCurrentUserAsync(
        CancellationToken cancellationToken)
    {
        var user = await _authService.GetCurrentUserAsync(cancellationToken);
        return Ok(ApiResponse<CurrentUserResponse>.Ok(user));
    }

    [HttpPost("change-password")]
    [Authorize]
    [EnableRateLimiting("ChangePassword")]
    public async Task<ActionResult<ApiResponse<CurrentUserResponse>>> ChangePasswordAsync(
        [FromBody] ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        var user = await _authService.ChangePasswordAsync(request, cancellationToken);
        return Ok(ApiResponse<CurrentUserResponse>.Ok(user, "Password changed successfully."));
    }
}
