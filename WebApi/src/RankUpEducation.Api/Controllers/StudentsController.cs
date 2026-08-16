using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Application.Students;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Students;

namespace RankUpEducation.Api.Controllers;

[ApiController]
[Authorize(Roles = "Student")]
[Route("api/students")]
public sealed class StudentsController : ControllerBase
{
    private readonly IStudentService _studentService;

    public StudentsController(IStudentService studentService)
    {
        _studentService = studentService;
    }

    /// <summary>Class placement and assigned people for the signed-in student.</summary>
    [HttpGet("me/overview")]
    public async Task<ActionResult<ApiResponse<StudentMeOverviewResponse>>> GetMyOverviewAsync(
        CancellationToken cancellationToken)
    {
        var response = await _studentService.GetMyOverviewAsync(cancellationToken);
        return Ok(ApiResponse<StudentMeOverviewResponse>.Ok(response));
    }
}
