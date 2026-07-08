using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Application.Parents;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Parents;

namespace RankUpEducation.Api.Controllers;

[ApiController]
[Authorize(Roles = "Parent")]
[Route("api/parents")]
public sealed class ParentsController : ControllerBase
{
    private readonly IParentService _parentService;

    public ParentsController(IParentService parentService)
    {
        _parentService = parentService;
    }

    [HttpGet("me/students")]
    public async Task<ActionResult<ApiResponse<LinkedStudentListResponse>>> ListLinkedStudentsAsync(
        CancellationToken cancellationToken)
    {
        var response = await _parentService.ListLinkedStudentsAsync(cancellationToken);
        return Ok(ApiResponse<LinkedStudentListResponse>.Ok(response));
    }
}
