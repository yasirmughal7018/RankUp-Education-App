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

    [HttpPost("schools")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<ApiResponse<SchoolResponse>>> CreateSchoolAsync(
        [FromBody] UpsertSchoolRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.CreateSchoolAsync(request, cancellationToken);
        return Ok(ApiResponse<SchoolResponse>.Ok(response, "School created."));
    }

    [HttpPut("schools/{schoolId:long}")]
    [Authorize(Roles = "SuperAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<SchoolResponse>>> UpdateSchoolAsync(
        long schoolId,
        [FromBody] UpsertSchoolRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.UpdateSchoolAsync(schoolId, request, cancellationToken);
        return Ok(ApiResponse<SchoolResponse>.Ok(response, "School updated."));
    }

    [HttpPost("schools/{schoolId:long}/deactivate")]
    [Authorize(Roles = "SuperAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> DeactivateSchoolAsync(
        long schoolId,
        CancellationToken cancellationToken)
    {
        await _directoryService.DeactivateSchoolAsync(schoolId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "School deactivated."));
    }

    [HttpPost("schools/{schoolId:long}/activate")]
    [Authorize(Roles = "SuperAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> ActivateSchoolAsync(
        long schoolId,
        CancellationToken cancellationToken)
    {
        await _directoryService.ActivateSchoolAsync(schoolId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "School activated."));
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

    [HttpPost("schools/{schoolId:long}/campuses")]
    [Authorize(Roles = "SuperAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<CampusResponse>>> CreateCampusAsync(
        long schoolId,
        [FromBody] UpsertCampusRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.CreateCampusAsync(schoolId, request, cancellationToken);
        return Ok(ApiResponse<CampusResponse>.Ok(response, "Campus created."));
    }

    [HttpPut("campuses/{campusId:long}")]
    [Authorize(Roles = "SuperAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<CampusResponse>>> UpdateCampusAsync(
        long campusId,
        [FromBody] UpsertCampusRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.UpdateCampusAsync(campusId, request, cancellationToken);
        return Ok(ApiResponse<CampusResponse>.Ok(response, "Campus updated."));
    }

    [HttpPost("campuses/{campusId:long}/deactivate")]
    [Authorize(Roles = "SuperAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> DeactivateCampusAsync(
        long campusId,
        CancellationToken cancellationToken)
    {
        await _directoryService.DeactivateCampusAsync(campusId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Campus deactivated."));
    }

    [HttpPost("campuses/{campusId:long}/activate")]
    [Authorize(Roles = "SuperAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> ActivateCampusAsync(
        long campusId,
        CancellationToken cancellationToken)
    {
        await _directoryService.ActivateCampusAsync(campusId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Campus activated."));
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
