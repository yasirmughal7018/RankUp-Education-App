using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Application.Directory;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Directory;

namespace RankUpEducation.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/directory")]
public sealed class DirectoryController : ControllerBase
{
    private readonly IDirectoryService _directoryService;

    public DirectoryController(IDirectoryService directoryService)
    {
        _directoryService = directoryService;
    }

    [HttpGet("schools")]
    [Authorize(Roles = "SuperAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<SchoolListResponse>>> ListSchoolsAsync(
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.ListSchoolsAsync(cancellationToken);
        return Ok(ApiResponse<SchoolListResponse>.Ok(response));
    }

    [HttpGet("schools/{schoolId:long}/campuses")]
    [Authorize(Roles = "SuperAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<CampusListResponse>>> ListCampusesAsync(
        long schoolId,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.ListCampusesAsync(schoolId, cancellationToken);
        return Ok(ApiResponse<CampusListResponse>.Ok(response));
    }

    [HttpGet("students")]
    [Authorize(Roles = "SuperAdmin,SchoolAdmin,Teacher")]
    public async Task<ActionResult<ApiResponse<DirectoryStudentListResponse>>> ListStudentsAsync(
        [FromQuery] int? schoolId,
        [FromQuery] int? campusId,
        [FromQuery] short? grade,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.ListStudentsAsync(
            schoolId,
            campusId,
            grade,
            search,
            cancellationToken);
        return Ok(ApiResponse<DirectoryStudentListResponse>.Ok(response));
    }

    [HttpGet("teachers")]
    [Authorize(Roles = "SuperAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<DirectoryTeacherListResponse>>> ListTeachersAsync(
        [FromQuery] int? schoolId,
        [FromQuery] int? campusId,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.ListTeachersAsync(
            schoolId,
            campusId,
            search,
            cancellationToken);
        return Ok(ApiResponse<DirectoryTeacherListResponse>.Ok(response));
    }

    [HttpGet("parents")]
    [Authorize(Roles = "SuperAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<DirectoryParentListResponse>>> ListParentsAsync(
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.ListParentsAsync(search, cancellationToken);
        return Ok(ApiResponse<DirectoryParentListResponse>.Ok(response));
    }

    [HttpPost("parents/{parentId:long}/students")]
    [Authorize(Roles = "SuperAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<LinkParentStudentResponse>>> LinkParentStudentAsync(
        long parentId,
        [FromBody] LinkParentStudentRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.LinkParentStudentAsync(parentId, request, cancellationToken);
        return Ok(ApiResponse<LinkParentStudentResponse>.Ok(response, "Parent linked to student."));
    }

    [HttpDelete("parents/{parentId:long}/students/{studentId:long}")]
    [Authorize(Roles = "SuperAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> UnlinkParentStudentAsync(
        long parentId,
        long studentId,
        CancellationToken cancellationToken)
    {
        await _directoryService.UnlinkParentStudentAsync(parentId, studentId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Parent-student link removed."));
    }
}
