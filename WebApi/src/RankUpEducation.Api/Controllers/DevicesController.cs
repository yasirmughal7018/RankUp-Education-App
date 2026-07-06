using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RankUpEducation.Application.Devices;
using RankUpEducation.Contracts.Common;
using RankUpEducation.Contracts.Devices;

namespace RankUpEducation.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/devices")]
public sealed class DevicesController : ControllerBase
{
    private readonly IDeviceService _deviceService;

    public DevicesController(IDeviceService deviceService)
    {
        _deviceService = deviceService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<object?>>> Register(
        RegisterDeviceRequest request,
        CancellationToken cancellationToken)
    {
        await _deviceService.RegisterAsync(request, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Device registered successfully."));
    }
}
