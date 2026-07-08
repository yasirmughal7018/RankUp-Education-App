using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Rewards;

namespace RankUpEducation.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/rewards")]
public sealed class RewardsController : ControllerBase
{
    [HttpGet("me")]
    public ActionResult<ApiResponse<RewardSummaryResponse>> GetMyRewards()
    {
        var response = new RewardSummaryResponse(0, Array.Empty<RewardItemResponse>());
        return Ok(ApiResponse<RewardSummaryResponse>.Ok(
            response,
            "Rewards API stub — no rewards yet."));
    }
}
