namespace RankUpEducation.Application.Common.Abstractions;

public interface ISmsService
{
    Task SendAsync(string mobileNumber, string message, CancellationToken cancellationToken);
}
