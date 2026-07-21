namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>Outbound email integration used by registration and notification flows.</summary>
public interface IEmailService
{
    /// <summary>Sends a plain-text or HTML email to the given recipient.</summary>
    Task SendAsync(string to, string subject, string body, CancellationToken cancellationToken);
}
