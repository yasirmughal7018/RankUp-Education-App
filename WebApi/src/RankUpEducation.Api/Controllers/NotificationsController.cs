using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Notifications;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Notifications;

namespace RankUpEducation.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/notifications")]
public sealed class NotificationsController : ControllerBase
{
    private readonly INotificationService _notifications;
    private readonly ICurrentUserService _currentUser;

    public NotificationsController(INotificationService notifications, ICurrentUserService currentUser)
    {
        _notifications = notifications;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<NotificationListResponse>>> GetNotifications(
        [FromQuery] int take = 50,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.UserId
            ?? throw new AuthenticationAppException("Authentication is required.");

        var response = await _notifications.ListForUserAsync(userId, take, cancellationToken);
        return Ok(ApiResponse<NotificationListResponse>.Ok(response));
    }
}
