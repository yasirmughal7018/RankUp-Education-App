using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Application.Lookups;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Lookups;

namespace RankUpEducation.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/lookups")]
public sealed class LookupsController : ControllerBase
{
    private readonly ILookupService _lookupService;

    public LookupsController(ILookupService lookupService)
    {
        _lookupService = lookupService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<LookupListResponse>>> ListAsync(
        [FromQuery] string? type,
        [FromQuery] short? parentId,
        CancellationToken cancellationToken)
    {
        var response = await _lookupService.ListAsync(type, parentId, cancellationToken);
        return Ok(ApiResponse<LookupListResponse>.Ok(response));
    }

    [HttpGet("types")]
    public async Task<ActionResult<ApiResponse<LookupTypesResponse>>> ListTypesAsync(
        CancellationToken cancellationToken)
    {
        var response = await _lookupService.ListTypesAsync(cancellationToken);
        return Ok(ApiResponse<LookupTypesResponse>.Ok(response));
    }
}
