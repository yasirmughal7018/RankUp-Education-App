using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Worksheets;

namespace RankUpEducation.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/worksheets")]
public sealed class WorksheetsController : ControllerBase
{
    [HttpGet]
    public ActionResult<ApiResponse<WorksheetListResponse>> GetWorksheets()
    {
        var response = new WorksheetListResponse(Array.Empty<WorksheetResponse>());
        return Ok(ApiResponse<WorksheetListResponse>.Ok(
            response,
            "Worksheets API stub — no worksheets yet."));
    }
}
