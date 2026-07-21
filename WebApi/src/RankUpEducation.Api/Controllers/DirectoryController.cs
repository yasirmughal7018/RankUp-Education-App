using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Application.Directory;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Directory;

namespace RankUpEducation.Api.Controllers;

/// <summary>REST endpoints for schools, campuses, and directory user management.</summary>
[ApiController]
[Authorize]
[Route("api/directory")]
public sealed class DirectoryController : ControllerBase
{
    private readonly IDirectoryService _directoryService;

    /// <summary>Creates the directory controller.</summary>
    public DirectoryController(IDirectoryService directoryService)
    {
        _directoryService = directoryService;
    }

    /// <summary>Returns directory dashboard counts for the current admin role.</summary>
    [HttpGet("summary")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<DirectorySummaryResponse>>> GetSummaryAsync(
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.GetSummaryAsync(cancellationToken);
        return Ok(ApiResponse<DirectorySummaryResponse>.Ok(response));
    }

    /// <summary>Lists schools visible to the current administrator.</summary>
    [HttpGet("schools")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<SchoolListResponse>>> ListSchoolsAsync(
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.ListSchoolsAsync(cancellationToken);
        return Ok(ApiResponse<SchoolListResponse>.Ok(response));
    }

    /// <summary>Creates a new school.</summary>
    [HttpPost("schools")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<SchoolResponse>>> CreateSchoolAsync(
        [FromBody] UpsertSchoolRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.CreateSchoolAsync(request, cancellationToken);
        return Ok(ApiResponse<SchoolResponse>.Ok(response, "School created."));
    }

    /// <summary>Updates an existing school.</summary>
    [HttpPut("schools/{schoolId:long}")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<SchoolResponse>>> UpdateSchoolAsync(
        long schoolId,
        [FromBody] UpsertSchoolRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.UpdateSchoolAsync(schoolId, request, cancellationToken);
        return Ok(ApiResponse<SchoolResponse>.Ok(response, "School updated."));
    }

    /// <summary>Deactivates a school.</summary>
    [HttpPost("schools/{schoolId:long}/deactivate")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> DeactivateSchoolAsync(
        long schoolId,
        CancellationToken cancellationToken)
    {
        await _directoryService.DeactivateSchoolAsync(schoolId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "School deactivated."));
    }

    /// <summary>Reactivates a school.</summary>
    [HttpPost("schools/{schoolId:long}/activate")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> ActivateSchoolAsync(
        long schoolId,
        CancellationToken cancellationToken)
    {
        await _directoryService.ActivateSchoolAsync(schoolId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "School activated."));
    }

    /// <summary>Lists campuses for a school.</summary>
    [HttpGet("schools/{schoolId:long}/campuses")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<CampusListResponse>>> ListCampusesAsync(
        long schoolId,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.ListCampusesAsync(schoolId, cancellationToken);
        return Ok(ApiResponse<CampusListResponse>.Ok(response));
    }

    /// <summary>Creates a campus under a school.</summary>
    [HttpPost("schools/{schoolId:long}/campuses")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<CampusResponse>>> CreateCampusAsync(
        long schoolId,
        [FromBody] UpsertCampusRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.CreateCampusAsync(schoolId, request, cancellationToken);
        return Ok(ApiResponse<CampusResponse>.Ok(response, "Campus created."));
    }

    /// <summary>Updates an existing campus.</summary>
    [HttpPut("campuses/{campusId:long}")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<CampusResponse>>> UpdateCampusAsync(
        long campusId,
        [FromBody] UpsertCampusRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.UpdateCampusAsync(campusId, request, cancellationToken);
        return Ok(ApiResponse<CampusResponse>.Ok(response, "Campus updated."));
    }

    /// <summary>Deactivates a campus.</summary>
    [HttpPost("campuses/{campusId:long}/deactivate")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> DeactivateCampusAsync(
        long campusId,
        CancellationToken cancellationToken)
    {
        await _directoryService.DeactivateCampusAsync(campusId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Campus deactivated."));
    }

    /// <summary>Reactivates a campus.</summary>
    [HttpPost("campuses/{campusId:long}/activate")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> ActivateCampusAsync(
        long campusId,
        CancellationToken cancellationToken)
    {
        await _directoryService.ActivateCampusAsync(campusId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Campus activated."));
    }

    /// <summary>Lists students with optional school, campus, grade, and search filters.</summary>
    [HttpGet("students")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin,Teacher")]
    public async Task<ActionResult<ApiResponse<DirectoryStudentListResponse>>> ListStudentsAsync(
        [FromQuery] int? schoolId,
        [FromQuery] int? campusId,
        [FromQuery] short? grade,
        [FromQuery] string? search,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var response = await _directoryService.ListStudentsAsync(
            schoolId,
            campusId,
            grade,
            search,
            pageNumber,
            pageSize,
            cancellationToken);
        return Ok(ApiResponse<DirectoryStudentListResponse>.Ok(response));
    }

    /// <summary>Provisions a new student in the directory.</summary>
    [HttpPost("students")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<DirectoryStudentResponse>>> CreateStudentAsync(
        [FromBody] CreateDirectoryStudentRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.CreateStudentAsync(request, cancellationToken);
        return Ok(ApiResponse<DirectoryStudentResponse>.Ok(response, "Student created."));
    }

    /// <summary>Updates an existing student.</summary>
    [HttpPut("students/{studentId:long}")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<DirectoryStudentResponse>>> UpdateStudentAsync(
        long studentId,
        [FromBody] UpdateDirectoryStudentRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.UpdateStudentAsync(studentId, request, cancellationToken);
        return Ok(ApiResponse<DirectoryStudentResponse>.Ok(response, "Student updated."));
    }

    /// <summary>Activates a student account.</summary>
    [HttpPost("students/{studentId:long}/activate")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> ActivateStudentAsync(
        long studentId,
        CancellationToken cancellationToken)
    {
        await _directoryService.ActivateStudentAsync(studentId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Student activated."));
    }

    /// <summary>Deactivates a student account.</summary>
    [HttpPost("students/{studentId:long}/deactivate")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> DeactivateStudentAsync(
        long studentId,
        CancellationToken cancellationToken)
    {
        await _directoryService.DeactivateStudentAsync(studentId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Student deactivated."));
    }

    /// <summary>Deactivates multiple students in one request.</summary>
    [HttpPost("students/bulk-deactivate")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<BulkActionResponse>>> BulkDeactivateStudentsAsync(
        [FromBody] BulkDeactivateRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.BulkDeactivateStudentsAsync(request, cancellationToken);
        return Ok(ApiResponse<BulkActionResponse>.Ok(response, "Students deactivated."));
    }

    /// <summary>Lists teachers with optional school, campus, and search filters.</summary>
    [HttpGet("teachers")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<DirectoryTeacherListResponse>>> ListTeachersAsync(
        [FromQuery] int? schoolId,
        [FromQuery] int? campusId,
        [FromQuery] string? search,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var response = await _directoryService.ListTeachersAsync(
            schoolId,
            campusId,
            search,
            pageNumber,
            pageSize,
            cancellationToken);
        return Ok(ApiResponse<DirectoryTeacherListResponse>.Ok(response));
    }

    /// <summary>Provisions a new teacher in the directory.</summary>
    [HttpPost("teachers")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<DirectoryTeacherResponse>>> CreateTeacherAsync(
        [FromBody] CreateDirectoryTeacherRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.CreateTeacherAsync(request, cancellationToken);
        return Ok(ApiResponse<DirectoryTeacherResponse>.Ok(response, "Teacher created."));
    }

    /// <summary>Updates an existing teacher.</summary>
    [HttpPut("teachers/{teacherId:long}")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<DirectoryTeacherResponse>>> UpdateTeacherAsync(
        long teacherId,
        [FromBody] UpdateDirectoryTeacherRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.UpdateTeacherAsync(teacherId, request, cancellationToken);
        return Ok(ApiResponse<DirectoryTeacherResponse>.Ok(response, "Teacher updated."));
    }

    /// <summary>Activates a teacher account.</summary>
    [HttpPost("teachers/{teacherId:long}/activate")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> ActivateTeacherAsync(
        long teacherId,
        CancellationToken cancellationToken)
    {
        await _directoryService.ActivateTeacherAsync(teacherId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Teacher activated."));
    }

    /// <summary>Deactivates a teacher account.</summary>
    [HttpPost("teachers/{teacherId:long}/deactivate")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> DeactivateTeacherAsync(
        long teacherId,
        CancellationToken cancellationToken)
    {
        await _directoryService.DeactivateTeacherAsync(teacherId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Teacher deactivated."));
    }

    /// <summary>Deactivates multiple teachers in one request.</summary>
    [HttpPost("teachers/bulk-deactivate")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<BulkActionResponse>>> BulkDeactivateTeachersAsync(
        [FromBody] BulkDeactivateRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.BulkDeactivateTeachersAsync(request, cancellationToken);
        return Ok(ApiResponse<BulkActionResponse>.Ok(response, "Teachers deactivated."));
    }

    /// <summary>Lists parents with optional search filter.</summary>
    [HttpGet("parents")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<DirectoryParentListResponse>>> ListParentsAsync(
        [FromQuery] string? search,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var response = await _directoryService.ListParentsAsync(search, pageNumber, pageSize, cancellationToken);
        return Ok(ApiResponse<DirectoryParentListResponse>.Ok(response));
    }

    /// <summary>Provisions a new parent in the directory.</summary>
    [HttpPost("parents")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<DirectoryParentResponse>>> CreateParentAsync(
        [FromBody] CreateDirectoryParentRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.CreateParentAsync(request, cancellationToken);
        return Ok(ApiResponse<DirectoryParentResponse>.Ok(response, "Parent created."));
    }

    /// <summary>Updates an existing parent.</summary>
    [HttpPut("parents/{parentId:long}")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<DirectoryParentResponse>>> UpdateParentAsync(
        long parentId,
        [FromBody] UpdateDirectoryParentRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.UpdateParentAsync(parentId, request, cancellationToken);
        return Ok(ApiResponse<DirectoryParentResponse>.Ok(response, "Parent updated."));
    }

    /// <summary>Activates a parent account.</summary>
    [HttpPost("parents/{parentId:long}/activate")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> ActivateParentAsync(
        long parentId,
        CancellationToken cancellationToken)
    {
        await _directoryService.ActivateParentAsync(parentId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Parent activated."));
    }

    /// <summary>Deactivates a parent account.</summary>
    [HttpPost("parents/{parentId:long}/deactivate")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> DeactivateParentAsync(
        long parentId,
        CancellationToken cancellationToken)
    {
        await _directoryService.DeactivateParentAsync(parentId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Parent deactivated."));
    }

    /// <summary>Deactivates multiple parents in one request.</summary>
    [HttpPost("parents/bulk-deactivate")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<BulkActionResponse>>> BulkDeactivateParentsAsync(
        [FromBody] BulkDeactivateRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.BulkDeactivateParentsAsync(request, cancellationToken);
        return Ok(ApiResponse<BulkActionResponse>.Ok(response, "Parents deactivated."));
    }

    /// <summary>Links a parent to a student.</summary>
    [HttpPost("parents/{parentId:long}/students")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<LinkParentStudentResponse>>> LinkParentStudentAsync(
        long parentId,
        [FromBody] LinkParentStudentRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.LinkParentStudentAsync(parentId, request, cancellationToken);
        return Ok(ApiResponse<LinkParentStudentResponse>.Ok(response, "Parent linked to student."));
    }

    /// <summary>Removes a parent-student link.</summary>
    [HttpDelete("parents/{parentId:long}/students/{studentId:long}")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin,CampusAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> UnlinkParentStudentAsync(
        long parentId,
        long studentId,
        CancellationToken cancellationToken)
    {
        await _directoryService.UnlinkParentStudentAsync(parentId, studentId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Parent-student link removed."));
    }

    /// <summary>Lists school admins (portal admin only).</summary>
    [HttpGet("school-admins")]
    [Authorize(Roles = "PortalAdmin")]
    public async Task<ActionResult<ApiResponse<DirectorySchoolAdminListResponse>>> ListSchoolAdminsAsync(
        [FromQuery] int? schoolId,
        [FromQuery] string? search,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var response = await _directoryService.ListSchoolAdminsAsync(
            schoolId,
            search,
            pageNumber,
            pageSize,
            cancellationToken);
        return Ok(ApiResponse<DirectorySchoolAdminListResponse>.Ok(response));
    }

    /// <summary>Provisions a new school admin.</summary>
    [HttpPost("school-admins")]
    [Authorize(Roles = "PortalAdmin")]
    public async Task<ActionResult<ApiResponse<DirectorySchoolAdminResponse>>> CreateSchoolAdminAsync(
        [FromBody] CreateDirectorySchoolAdminRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.CreateSchoolAdminAsync(request, cancellationToken);
        return Ok(ApiResponse<DirectorySchoolAdminResponse>.Ok(
            response,
            "School admin created. They must set a password on first login."));
    }

    /// <summary>Updates an existing school admin.</summary>
    [HttpPut("school-admins/{userId:long}")]
    [Authorize(Roles = "PortalAdmin")]
    public async Task<ActionResult<ApiResponse<DirectorySchoolAdminResponse>>> UpdateSchoolAdminAsync(
        long userId,
        [FromBody] UpdateDirectorySchoolAdminRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.UpdateSchoolAdminAsync(userId, request, cancellationToken);
        return Ok(ApiResponse<DirectorySchoolAdminResponse>.Ok(response, "School admin updated."));
    }

    /// <summary>Activates a school admin account.</summary>
    [HttpPost("school-admins/{userId:long}/activate")]
    [Authorize(Roles = "PortalAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> ActivateSchoolAdminAsync(
        long userId,
        CancellationToken cancellationToken)
    {
        await _directoryService.ActivateSchoolAdminAsync(userId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "School admin activated."));
    }

    /// <summary>Deactivates a school admin account.</summary>
    [HttpPost("school-admins/{userId:long}/deactivate")]
    [Authorize(Roles = "PortalAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> DeactivateSchoolAdminAsync(
        long userId,
        CancellationToken cancellationToken)
    {
        await _directoryService.DeactivateSchoolAdminAsync(userId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "School admin deactivated."));
    }

    /// <summary>Lists campus admins for portal or school admins.</summary>
    [HttpGet("campus-admins")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<DirectoryCampusAdminListResponse>>> ListCampusAdminsAsync(
        [FromQuery] int? schoolId,
        [FromQuery] int? campusId,
        [FromQuery] string? search,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var response = await _directoryService.ListCampusAdminsAsync(
            schoolId,
            campusId,
            search,
            pageNumber,
            pageSize,
            cancellationToken);
        return Ok(ApiResponse<DirectoryCampusAdminListResponse>.Ok(response));
    }

    /// <summary>Provisions a new campus admin.</summary>
    [HttpPost("campus-admins")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<DirectoryCampusAdminResponse>>> CreateCampusAdminAsync(
        [FromBody] CreateDirectoryCampusAdminRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.CreateCampusAdminAsync(request, cancellationToken);
        return Ok(ApiResponse<DirectoryCampusAdminResponse>.Ok(
            response,
            "Campus admin created. They must set a password on first login."));
    }

    /// <summary>Updates an existing campus admin.</summary>
    [HttpPut("campus-admins/{userId:long}")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<DirectoryCampusAdminResponse>>> UpdateCampusAdminAsync(
        long userId,
        [FromBody] UpdateDirectoryCampusAdminRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _directoryService.UpdateCampusAdminAsync(userId, request, cancellationToken);
        return Ok(ApiResponse<DirectoryCampusAdminResponse>.Ok(response, "Campus admin updated."));
    }

    /// <summary>Activates a campus admin account.</summary>
    [HttpPost("campus-admins/{userId:long}/activate")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> ActivateCampusAdminAsync(
        long userId,
        CancellationToken cancellationToken)
    {
        await _directoryService.ActivateCampusAdminAsync(userId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Campus admin activated."));
    }

    /// <summary>Deactivates a campus admin account.</summary>
    [HttpPost("campus-admins/{userId:long}/deactivate")]
    [Authorize(Roles = "PortalAdmin,SchoolAdmin")]
    public async Task<ActionResult<ApiResponse<object?>>> DeactivateCampusAdminAsync(
        long userId,
        CancellationToken cancellationToken)
    {
        await _directoryService.DeactivateCampusAdminAsync(userId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Campus admin deactivated."));
    }
}
