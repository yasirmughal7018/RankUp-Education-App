using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Contracts.Attendance;
using RankUpEducation.Contracts.Common;

namespace RankUpEducation.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/attendance")]
public sealed class AttendanceController : ControllerBase
{
    [HttpGet("me")]
    public ActionResult<ApiResponse<AttendanceListResponse>> GetMyAttendance()
    {
        var response = new AttendanceListResponse(Array.Empty<AttendanceRecordResponse>());
        return Ok(ApiResponse<AttendanceListResponse>.Ok(
            response,
            "Attendance API stub — no records yet."));
    }
}
