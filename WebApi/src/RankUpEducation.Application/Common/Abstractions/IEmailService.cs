namespace RankUpEducation.Application.Common.Abstractions;

public interface IEmailService
{
    Task SendAsync(string to, string subject, string body, CancellationToken cancellationToken);
}
