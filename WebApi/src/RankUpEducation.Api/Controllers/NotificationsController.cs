using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Notifications;

namespace RankUpEducation.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/notifications")]
public sealed class NotificationsController : ControllerBase
{
    [HttpGet]
    public ActionResult<ApiResponse<NotificationListResponse>> GetNotifications()
    {
        var response = new NotificationListResponse(Array.Empty<NotificationResponse>());
        return Ok(ApiResponse<NotificationListResponse>.Ok(
            response,
            "Notifications API stub — no notifications yet."));
    }
}
