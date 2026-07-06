using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RankUpEducation.Application.Auth;
using RankUpEducation.Contracts.Auth;
using RankUpEducation.Contracts.Common;

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

    [HttpGet("registrations/pending")]
    [Authorize(Roles = "SuperAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<PendingRegistrationResponse>>>> ListPendingRegistrationsAsync(
        [FromQuery] int take,
        CancellationToken cancellationToken)
    {
        var result = await _authService.ListPendingRegistrationsAsync(take <= 0 ? 50 : take, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<PendingRegistrationResponse>>.Ok(result));
    }

    [HttpPost("registrations/{userId:long}/approve")]
    [Authorize(Roles = "SuperAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<CurrentUserResponse>>> ApproveRegistrationAsync(
        long userId,
        [FromBody] ApproveRegistrationRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.ApproveRegistrationAsync(userId, request, cancellationToken);
        return Ok(ApiResponse<CurrentUserResponse>.Ok(result, "Registration approved."));
    }

    [HttpPost("registrations/{userId:long}/reject")]
    [Authorize(Roles = "SuperAdmin,SchoolAdmin")]
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
}
