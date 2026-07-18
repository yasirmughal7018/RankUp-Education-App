using RankUpEducation.Application.Common.Abstractions;

namespace RankUpEducation.Api.Integrations;

public static class DependencyInjection
{
    public static IServiceCollection AddApiIntegrationFallbacks(this IServiceCollection services)
    {
        services.AddScoped<IEmailService, NoOpEmailService>();
        services.AddScoped<ISmsService, NoOpSmsService>();
        services.AddScoped<IPushNotificationService, NoOpPushNotificationService>();
        services.AddScoped<IFileStorageService, LocalFileStorageService>();

        return services;
    }
}
