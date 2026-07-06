using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using RankUpEducation.Application.Common.Abstractions;

namespace RankUpEducation.Infrastructure.Authentication;

public sealed class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public long? UserId
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? _httpContextAccessor.HttpContext?.User.FindFirstValue("userId");

            return long.TryParse(value, out var userId) ? userId : null;
        }
    }

    public string? Role => _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Role)
        ?? _httpContextAccessor.HttpContext?.User.FindFirstValue("role");

    public long? ProfileId => ReadLongClaim("profileId");

    public int? SchoolId => ReadIntClaim("schoolId");

    public int? CampusId => ReadIntClaim("campusId");

    private long? ReadLongClaim(string claimType)
    {
        var value = _httpContextAccessor.HttpContext?.User.FindFirstValue(claimType);
        return long.TryParse(value, out var parsed) ? parsed : null;
    }

    private int? ReadIntClaim(string claimType)
    {
        var value = _httpContextAccessor.HttpContext?.User.FindFirstValue(claimType);
        return int.TryParse(value, out var parsed) ? parsed : null;
    }
}
