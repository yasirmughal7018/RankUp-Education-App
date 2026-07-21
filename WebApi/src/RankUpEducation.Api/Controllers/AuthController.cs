using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RankUpEducation.Application.Auth;
using RankUpEducation.Application.Directory;
using RankUpEducation.Contracts.Auth;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Directory;

namespace RankUpEducation.Api.Controllers;

/// <summary>Authentication, registration, profile, and school-change HTTP endpoints.</summary>
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

    /// <summary>Sign in with CNIC/mobile and password.</summary>
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

    /// <summary>Switch the active role for a multi-role account and re-issue tokens.</summary>
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

    /// <summary>Self-service registration for Student, Parent, or Teacher.</summary>
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

    /// <summary>Public school list for the registration form.</summary>
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

    /// <summary>Public campus list for a selected school on the registration form.</summary>
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

    /// <summary>Admin queue of pending self-registration requests.</summary>
    [HttpGet("registrations/pending")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<PendingRegistrationResponse>>>> ListPendingRegistrationsAsync(
        [FromQuery] int take,
        CancellationToken cancellationToken)
    {
        var result = await _authService.ListPendingRegistrationsAsync(take <= 0 ? 50 : take, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<PendingRegistrationResponse>>.Ok(result));
    }

    /// <summary>Approve a pending registration (Portal Admin activates the account).</summary>
    [HttpPost("registrations/{userId:long}/approve")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<ApproveRegistrationResponse>>> ApproveRegistrationAsync(
        long userId,
        CancellationToken cancellationToken)
    {
        var result = await _authService.ApproveRegistrationAsync(userId, cancellationToken);
        return Ok(ApiResponse<ApproveRegistrationResponse>.Ok(result, result.Message));
    }

    /// <summary>Reject a pending registration request.</summary>
    [HttpPost("registrations/{userId:long}/reject")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> RejectRegistrationAsync(
        long userId,
        CancellationToken cancellationToken)
    {
        await _authService.RejectRegistrationAsync(userId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Registration rejected."));
    }

    /// <summary>Request admin-mediated password reset (always returns success to the client).</summary>
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

    /// <summary>
    /// Admin clears a user's password after a forgot-password notification so they can set a new one on login.
    /// </summary>
    [HttpPost("password-reset/clear")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> ClearPasswordForResetAsync(
        [FromBody] PasswordResetRequest request,
        CancellationToken cancellationToken)
    {
        await _authService.ClearPasswordForResetAsync(request, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(
            null,
            "Password cleared. The user can set a new password on the login screen."));
    }

    /// <summary>Rotate access and refresh tokens without re-entering credentials.</summary>
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

    /// <summary>Revoke the supplied refresh token.</summary>
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

    /// <summary>Current signed-in user profile and permissions.</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<CurrentUserResponse>>> GetCurrentUserAsync(
        CancellationToken cancellationToken)
    {
        var user = await _authService.GetCurrentUserAsync(cancellationToken);
        return Ok(ApiResponse<CurrentUserResponse>.Ok(user));
    }

    /// <summary>Update display name and contact fields (school/campus via school-change flow).</summary>
    [HttpPut("me")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<CurrentUserResponse>>> UpdateProfileAsync(
        [FromBody] UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        var user = await _authService.UpdateProfileAsync(request, cancellationToken);
        return Ok(ApiResponse<CurrentUserResponse>.Ok(user, "Profile updated successfully."));
    }

    /// <summary>Request transfer to another school/campus; locks the account until resolved.</summary>
    [HttpPost("me/school-change")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<RequestSchoolChangeResponse>>> RequestSchoolChangeAsync(
        [FromBody] RequestSchoolChangeRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.RequestSchoolChangeAsync(request, cancellationToken);
        return Ok(ApiResponse<RequestSchoolChangeResponse>.Ok(result, result.Message));
    }

    /// <summary>Upload or replace the signed-in user's profile avatar (max 5 MB).</summary>
    [HttpPost("me/avatar")]
    [Authorize]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<CurrentUserResponse>>> UploadAvatarAsync(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(ApiResponse<object?>.Fail("Avatar image is required."));
        }

        await using var stream = file.OpenReadStream();
        var user = await _authService.UploadAvatarAsync(
            stream,
            file.FileName,
            file.ContentType,
            cancellationToken);
        return Ok(ApiResponse<CurrentUserResponse>.Ok(user, "Avatar updated successfully."));
    }

    /// <summary>Self-deactivate the account after password confirmation.</summary>
    [HttpPost("me/deactivate")]
    [Authorize]
    [EnableRateLimiting("ChangePassword")]
    public async Task<ActionResult<ApiResponse<object?>>> DeactivateAccountAsync(
        [FromBody] DeactivateAccountRequest request,
        CancellationToken cancellationToken)
    {
        await _authService.DeactivateAccountAsync(request, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Account deactivated successfully."));
    }

    /// <summary>Admin queue of pending school/campus change requests.</summary>
    [HttpGet("school-changes/pending")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<PendingSchoolChangeResponse>>>> ListPendingSchoolChangesAsync(
        [FromQuery] int take = 50,
        CancellationToken cancellationToken = default)
    {
        var items = await _authService.ListPendingSchoolChangesAsync(take, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<PendingSchoolChangeResponse>>.Ok(items));
    }

    /// <summary>Approve a school/campus change (may apply immediately when authorized).</summary>
    [HttpPost("school-changes/{requestId:long}/approve")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<ApproveSchoolChangeResponse>>> ApproveSchoolChangeAsync(
        long requestId,
        CancellationToken cancellationToken)
    {
        var result = await _authService.ApproveSchoolChangeAsync(requestId, cancellationToken);
        return Ok(ApiResponse<ApproveSchoolChangeResponse>.Ok(result, result.Message));
    }

    /// <summary>Reject a school/campus change and unlock the requester's account.</summary>
    [HttpPost("school-changes/{requestId:long}/reject")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> RejectSchoolChangeAsync(
        long requestId,
        CancellationToken cancellationToken)
    {
        await _authService.RejectSchoolChangeAsync(requestId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "School/campus change request rejected."));
    }

    /// <summary>Change password while signed in (or complete first-time setup).</summary>
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
