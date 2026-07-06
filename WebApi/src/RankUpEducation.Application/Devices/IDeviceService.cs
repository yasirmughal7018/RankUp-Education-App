using RankUpEducation.Contracts.Devices;

namespace RankUpEducation.Application.Devices;

public interface IDeviceService
{
    Task RegisterAsync(RegisterDeviceRequest request, CancellationToken cancellationToken);
}
