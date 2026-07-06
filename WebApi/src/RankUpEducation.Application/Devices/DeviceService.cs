using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Contracts.Devices;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Devices;

public sealed class DeviceService : IDeviceService
{
    private readonly IUserRepository _users;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly IUnitOfWork _unitOfWork;

    public DeviceService(
        IUserRepository users,
        ICurrentUserService currentUser,
        IDateTimeProvider dateTimeProvider,
        IUnitOfWork unitOfWork)
    {
        _users = users;
        _currentUser = currentUser;
        _dateTimeProvider = dateTimeProvider;
        _unitOfWork = unitOfWork;
    }

    public async Task RegisterAsync(RegisterDeviceRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.DeviceId))
        {
            throw new ValidationAppException(["Device id is required."]);
        }

        var userId = _currentUser.UserId ?? throw new AuthenticationAppException("Authentication is required.");
        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundAppException("User account was not found.");

        user.RegisterDevice(new DeviceSession(
            user.Id,
            request.DeviceId,
            request.Platform,
            request.PushToken,
            request.AppVersion,
            _dateTimeProvider.UtcNow));

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
