using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Application.Teachers;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Teachers;

namespace RankUpEducation.Api.Controllers;

[ApiController]
[Authorize(Roles = "Teacher,Coordinator")]
[Route("api/teachers")]
public sealed class TeachersController : ControllerBase
{
    private readonly ITeacherService _teacherService;

    public TeachersController(ITeacherService teacherService)
    {
        _teacherService = teacherService;
    }

    /// <summary>Students in the signed-in teacher's assigned class/section combinations.</summary>
    [HttpGet("me/roster")]
    public async Task<ActionResult<ApiResponse<TeacherRosterListResponse>>> GetMyRosterAsync(
        CancellationToken cancellationToken)
    {
        var response = await _teacherService.GetMyRosterAsync(cancellationToken);
        return Ok(ApiResponse<TeacherRosterListResponse>.Ok(response));
    }

    [HttpGet("me/groups")]
    public async Task<ActionResult<ApiResponse<TeacherGroupListResponse>>> ListMyGroupsAsync(
        CancellationToken cancellationToken)
    {
        var response = await _teacherService.ListMyGroupsAsync(cancellationToken);
        return Ok(ApiResponse<TeacherGroupListResponse>.Ok(response));
    }

    [HttpPost("me/groups")]
    public async Task<ActionResult<ApiResponse<TeacherGroupResponse>>> CreateGroupAsync(
        [FromBody] CreateTeacherGroupRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _teacherService.CreateGroupAsync(request, cancellationToken);
        return Ok(ApiResponse<TeacherGroupResponse>.Ok(response, "Group created."));
    }

    [HttpPut("me/groups/{groupId:long}")]
    public async Task<ActionResult<ApiResponse<TeacherGroupResponse>>> UpdateGroupAsync(
        long groupId,
        [FromBody] UpdateTeacherGroupRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _teacherService.UpdateGroupAsync(groupId, request, cancellationToken);
        return Ok(ApiResponse<TeacherGroupResponse>.Ok(response, "Group updated."));
    }

    [HttpDelete("me/groups/{groupId:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> DeactivateGroupAsync(
        long groupId,
        CancellationToken cancellationToken)
    {
        await _teacherService.DeactivateGroupAsync(groupId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Group removed."));
    }

    [HttpPost("me/groups/{groupId:long}/members")]
    public async Task<ActionResult<ApiResponse<TeacherGroupResponse>>> AddGroupMemberAsync(
        long groupId,
        [FromBody] AddTeacherGroupMemberRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _teacherService.AddGroupMemberAsync(groupId, request, cancellationToken);
        return Ok(ApiResponse<TeacherGroupResponse>.Ok(response, "Student added to group."));
    }

    [HttpDelete("me/groups/{groupId:long}/members/{studentId:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> RemoveGroupMemberAsync(
        long groupId,
        long studentId,
        CancellationToken cancellationToken)
    {
        await _teacherService.RemoveGroupMemberAsync(groupId, studentId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Student removed from group."));
    }

    /// <summary>Adds an existing student to one of the teacher's assigned class/section pairs by CNIC or username.</summary>
    [HttpPost("me/students")]
    public async Task<ActionResult<ApiResponse<AddMyStudentResponse>>> AddMyStudentAsync(
        [FromBody] AddMyStudentRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _teacherService.AddMyStudentAsync(request, cancellationToken);
        var message = response.AlreadyOnRoster
            ? "This student was already in that class and section."
            : "Student added to your class.";
        return Ok(ApiResponse<AddMyStudentResponse>.Ok(response, message));
    }
}
