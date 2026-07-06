using System.Security.Cryptography;
using System.Text;

namespace RankUpEducation.Common.Utilities;

public static class TokenHasher
{
    /// <summary>Hex SHA-256 hash used for refresh token persistence in PostgreSQL.</summary>
    public static string HashTokenSha256Hex(string plain)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(plain));
        return Convert.ToHexString(bytes);
    }

    public static string HashRefreshToken(string plain) => HashTokenSha256Hex(plain);

    public static string GenerateRefreshToken()
    {
        var buffer = new byte[64];
        RandomNumberGenerator.Fill(buffer);
        return Convert.ToBase64String(buffer);
    }

    /// <summary>URL-safe opaque token for password reset and email verification links.</summary>
    public static string GenerateUrlSafeToken()
    {
        var buffer = new byte[32];
        RandomNumberGenerator.Fill(buffer);
        return Convert.ToBase64String(buffer).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
