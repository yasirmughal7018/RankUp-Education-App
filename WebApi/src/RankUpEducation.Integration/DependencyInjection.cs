using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Integration.Email;
using RankUpEducation.Integration.FileStorage;
using RankUpEducation.Integration.PushNotifications;
using RankUpEducation.Integration.Sms;

namespace RankUpEducation.Integration;

public static class DependencyInjection
{
    public static IServiceCollection AddIntegration(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddScoped<IEmailService, NoOpEmailService>();
        services.AddScoped<ISmsService, NoOpSmsService>();
        services.AddScoped<IPushNotificationService, NoOpPushNotificationService>();
        services.AddScoped<IFileStorageService, NoOpFileStorageService>();

        return services;
    }
}
