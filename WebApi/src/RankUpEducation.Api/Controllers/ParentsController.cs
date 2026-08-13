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

    /// <summary>Links a student to the signed-in parent by CNIC or username.</summary>
    [HttpPost("me/students")]
    public async Task<ActionResult<ApiResponse<LinkMyChildResponse>>> LinkMyChildAsync(
        [FromBody] LinkMyChildRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _parentService.LinkMyChildAsync(request, cancellationToken);
        var message = response.AlreadyLinked
            ? "This student was already linked to your account."
            : "Child linked successfully.";
        return Ok(ApiResponse<LinkMyChildResponse>.Ok(response, message));
    }
}
