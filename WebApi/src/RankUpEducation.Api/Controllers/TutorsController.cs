using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Application.Tutors;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Tutors;

namespace RankUpEducation.Api.Controllers;

[ApiController]
[Authorize(Roles = "Tutor")]
[Route("api/tutors")]
public sealed class TutorsController : ControllerBase
{
    private readonly ITutorService _tutorService;

    public TutorsController(ITutorService tutorService)
    {
        _tutorService = tutorService;
    }

    [HttpGet("me/students")]
    public async Task<ActionResult<ApiResponse<TutorLinkedStudentListResponse>>> ListLinkedStudentsAsync(
        CancellationToken cancellationToken)
    {
        var response = await _tutorService.ListLinkedStudentsAsync(cancellationToken);
        return Ok(ApiResponse<TutorLinkedStudentListResponse>.Ok(response));
    }

    /// <summary>Links a student to the signed-in tutor by CNIC or username. Does not change the student's school.</summary>
    [HttpPost("me/students")]
    public async Task<ActionResult<ApiResponse<LinkTutorStudentResponse>>> LinkStudentAsync(
        [FromBody] LinkTutorStudentRequest request,
        CancellationToken cancellationToken)
    {
        var response = await _tutorService.LinkStudentAsync(request, cancellationToken);
        var message = response.AlreadyLinked
            ? "This student was already linked to your account."
            : "Student linked successfully.";
        return Ok(ApiResponse<LinkTutorStudentResponse>.Ok(response, message));
    }

    /// <summary>Removes the tutor's access to a linked student.</summary>
    [HttpDelete("me/students/{studentId:long}")]
    public async Task<ActionResult<ApiResponse<object?>>> UnlinkStudentAsync(
        long studentId,
        CancellationToken cancellationToken)
    {
        await _tutorService.UnlinkStudentAsync(studentId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Student unlinked."));
    }
}
