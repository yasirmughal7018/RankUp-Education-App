using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Application.Lookups;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Lookups;

namespace RankUpEducation.Api.Controllers;

/// <summary>Read-only reference lookup catalog for clients.</summary>
[ApiController]
[Authorize]
[Route("api/lookups")]
public sealed class LookupsController : ControllerBase
{
    private readonly ILookupService _lookupService;

    /// <summary>Creates the lookups controller.</summary>
    public LookupsController(ILookupService lookupService)
    {
        _lookupService = lookupService;
    }

    /// <summary>Lists active lookups, optionally filtered by type and parent id.</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<LookupListResponse>>> ListAsync(
        [FromQuery] string? type,
        [FromQuery] short? parentId,
        CancellationToken cancellationToken)
    {
        var response = await _lookupService.ListAsync(type, parentId, cancellationToken);
        return Ok(ApiResponse<LookupListResponse>.Ok(response));
    }

    /// <summary>Lists distinct active lookup type names.</summary>
    [HttpGet("types")]
    public async Task<ActionResult<ApiResponse<LookupTypesResponse>>> ListTypesAsync(
        CancellationToken cancellationToken)
    {
        var response = await _lookupService.ListTypesAsync(cancellationToken);
        return Ok(ApiResponse<LookupTypesResponse>.Ok(response));
    }
}
