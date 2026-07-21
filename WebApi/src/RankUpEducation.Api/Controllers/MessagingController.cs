using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Messaging;

namespace RankUpEducation.Api.Controllers;

/// <summary>Messaging inbox endpoints (stub until full messaging is implemented).</summary>
[ApiController]
[Authorize]
[Route("api/messaging")]
public sealed class MessagingController : ControllerBase
{
    /// <summary>Returns an empty thread list placeholder.</summary>
    [HttpGet("threads")]
    public ActionResult<ApiResponse<MessageThreadListResponse>> GetThreads()
    {
        var response = new MessageThreadListResponse(Array.Empty<MessageThreadResponse>());
        return Ok(ApiResponse<MessageThreadListResponse>.Ok(
            response,
            "Messaging API stub — no threads yet."));
    }
}
