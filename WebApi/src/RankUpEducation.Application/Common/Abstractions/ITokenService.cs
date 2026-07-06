using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Common.Abstractions;

public interface ITokenService
{
    string CreateAccessToken(User user);
    string CreateRefreshToken();
    string HashToken(string token);
}
