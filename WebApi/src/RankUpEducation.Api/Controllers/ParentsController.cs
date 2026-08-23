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

    [HttpGet("me/groups")]
    public async Task<ActionResult<ApiResponse<ParentGroupListResponse>>> ListMyGroupsAsync(
        CancellationToken cancellationToken)
    {
        var response = await _parentService.ListMyGroupsAsync(cancellationToken);
        return Ok(ApiResponse<ParentGroupListResponse>.Ok(response));
    }

    [HttpPost("me/groups")]
    public async Task<ActionResult<ApiResponse<ParentGroupResponse>>> CreateGroupAsync(
        [FromBody] CreateParentGroupRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _parentService.CreateGroupAsync(request, cancellationToken);
        return Ok(ApiResponse<ParentGroupResponse>.Ok(response, "Group created."));
    }

    [HttpPut("me/groups/{groupId:long}")]
    public async Task<ActionResult<ApiResponse<ParentGroupResponse>>> UpdateGroupAsync(
        long groupId,
        [FromBody] UpdateParentGroupRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _parentService.UpdateGroupAsync(groupId, request, cancellationToken);
        return Ok(ApiResponse<ParentGroupResponse>.Ok(response, "Group updated."));
    }

    [HttpDelete("me/groups/{groupId:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> DeactivateGroupAsync(
        long groupId,
        CancellationToken cancellationToken)
    {
        await _parentService.DeactivateGroupAsync(groupId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Group removed."));
    }

    [HttpPost("me/groups/{groupId:long}/members")]
    public async Task<ActionResult<ApiResponse<ParentGroupResponse>>> AddGroupMemberAsync(
        long groupId,
        [FromBody] AddParentGroupMemberRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _parentService.AddGroupMemberAsync(groupId, request, cancellationToken);
        return Ok(ApiResponse<ParentGroupResponse>.Ok(response, "Child added to group."));
    }

    [HttpDelete("me/groups/{groupId:long}/members/{studentId:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> RemoveGroupMemberAsync(
        long groupId,
        long studentId,
        CancellationToken cancellationToken)
    {
        await _parentService.RemoveGroupMemberAsync(groupId, studentId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Child removed from group."));
    }
}
