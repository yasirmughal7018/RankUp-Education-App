namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>Outbound SMS integration for OTP and alert delivery.</summary>
public interface ISmsService
{
    /// <summary>Sends an SMS message to the given mobile number.</summary>
    Task SendAsync(string mobileNumber, string message, CancellationToken cancellationToken);
}
