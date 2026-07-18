using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Competitions;

namespace RankUpEducation.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/competitions")]
public sealed class CompetitionsController : ControllerBase
{
    [HttpGet]
    public ActionResult<ApiResponse<CompetitionListResponse>> GetCompetitions()
    {
        var response = new CompetitionListResponse(Array.Empty<CompetitionResponse>());
        return Ok(ApiResponse<CompetitionListResponse>.Ok(
            response,
            "Competitions API stub — no competitions yet."));
    }
}
