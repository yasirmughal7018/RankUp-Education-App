using Microsoft.Extensions.DependencyInjection;
using RankUpEducation.Application.Auth;
using RankUpEducation.Application.Devices;
using RankUpEducation.Application.Quizzes;

namespace RankUpEducation.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IDeviceService, DeviceService>();
        services.AddScoped<IQuizService, QuizService>();

        return services;
    }
}
