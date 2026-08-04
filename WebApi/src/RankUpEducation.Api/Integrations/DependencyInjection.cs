using RankUpEducation.Application.Common.Abstractions;

namespace RankUpEducation.Api.Integrations;

/// <summary>Registers default no-op integrations and local file storage for the API host.</summary>
public static class DependencyInjection
{
    /// <summary>Adds email, SMS, push, and file storage implementations for the web host.</summary>
    public static IServiceCollection AddApiIntegrationFallbacks(this IServiceCollection services)
    {
        services.AddScoped<IEmailService, NoOpEmailService>();
        services.AddScoped<ISmsService, NoOpSmsService>();
        services.AddScoped<IPushNotificationService, NoOpPushNotificationService>();
        services.AddScoped<IFileStorageService, LocalFileStorageService>();

        return services;
    }
}
