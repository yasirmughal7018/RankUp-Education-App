using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Messaging;

namespace RankUpEducation.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/messaging")]
public sealed class MessagingController : ControllerBase
{
    [HttpGet("threads")]
    public ActionResult<ApiResponse<MessageThreadListResponse>> GetThreads()
    {
        var response = new MessageThreadListResponse(Array.Empty<MessageThreadResponse>());
        return Ok(ApiResponse<MessageThreadListResponse>.Ok(
            response,
            "Messaging API stub — no threads yet."));
    }
}
