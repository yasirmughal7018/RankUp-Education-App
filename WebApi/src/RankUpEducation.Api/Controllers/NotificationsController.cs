using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Notifications;
using RankUpEducation.Common.Utilities;
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

    [HttpPost("{notificationId:long}/read")]
    public async Task<ActionResult<ApiResponse<object?>>> MarkReadAsync(
        long notificationId,
        CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId
            ?? throw new AuthenticationAppException("Authentication is required.");

        await _notifications.MarkReadAsync(userId, notificationId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Notification marked as read."));
    }

    [HttpPost("read-category")]
    public async Task<ActionResult<ApiResponse<object?>>> MarkCategoryReadAsync(
        [FromQuery] string category,
        CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId
            ?? throw new AuthenticationAppException("Authentication is required.");

        if (!category.HasTrimmedText())
        {
            throw new ValidationAppException(["Category is required."]);
        }

        await _notifications.MarkCategoryReadAsync(userId, category.AsTrimmedString(), cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Notifications marked as read."));
    }
}
