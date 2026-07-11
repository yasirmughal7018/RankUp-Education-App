using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using RankUpEducation.Application.Auth;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Infrastructure.Authentication;

public sealed class JwtTokenService : ITokenService
{
    private readonly JwtOptions _options;
    private readonly IDateTimeProvider _dateTimeProvider;

    public JwtTokenService(IOptions<JwtOptions> options, IDateTimeProvider dateTimeProvider)
    {
        _options = options.Value;
        _dateTimeProvider = dateTimeProvider;
    }

    public string CreateAccessToken(User user, UserRole activeRole)
    {
        if (!user.HasRole(activeRole))
        {
            activeRole = user.Role;
        }

        var allRoles = string.Join(',', user.Roles.Select(role => role.ToString()));
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new("userId", user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Role, activeRole.ToString()),
            new("role", activeRole.ToString()),
            new("roles", allRoles),
            new("permissions", string.Join(',', AuthPermissions.ForRole(activeRole)))
        };

        AddOptionalClaim(claims, "schoolId", user.SchoolId);
        AddOptionalClaim(claims, "campusId", user.CampusId);
        AddOptionalClaim(claims, "profileId", user.ProfileId);

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
        var expires = _dateTimeProvider.UtcNow.AddMinutes(_options.AccessTokenMinutes);

        var token = new JwtSecurityToken(
            _options.Issuer,
            _options.Audience,
            claims,
            expires: expires.UtcDateTime,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string CreateRefreshToken() => TokenHasher.GenerateRefreshToken();

    public string HashToken(string token) => TokenHasher.HashTokenSha256Hex(token);

    private static void AddOptionalClaim(List<Claim> claims, string type, long? value)
    {
        if (value is not null)
        {
            claims.Add(new Claim(type, value.Value.ToString()));
        }
    }

    private static void AddOptionalClaim(List<Claim> claims, string type, int? value)
    {
        if (value is not null)
        {
            claims.Add(new Claim(type, value.Value.ToString()));
        }
    }
}
