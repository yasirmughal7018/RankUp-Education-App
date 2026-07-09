using Microsoft.Extensions.DependencyInjection;
using RankUpEducation.Application.Auth;
using RankUpEducation.Application.Devices;
using RankUpEducation.Application.Directory;
using RankUpEducation.Application.Lookups;
using RankUpEducation.Application.Notifications;
using RankUpEducation.Application.Parents;
using RankUpEducation.Application.Questions;
using RankUpEducation.Application.QuizQuestions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Application.Reports;

namespace RankUpEducation.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IDeviceService, DeviceService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IQuizService, QuizService>();
        services.AddScoped<IQuizManageService, QuizManageService>();
        services.AddScoped<IQuestionService, QuestionService>();
        services.AddScoped<IQuizQuestionService, QuizQuestionService>();
        services.AddScoped<IQuizAssignService, QuizAssignService>();
        services.AddScoped<IQuizMonitorService, QuizMonitorService>();
        services.AddScoped<IQuizReviewService, QuizReviewService>();
        services.AddScoped<ILookupService, LookupService>();
        services.AddScoped<IParentService, ParentService>();
        services.AddScoped<IDirectoryService, DirectoryService>();
        services.AddScoped<IReportService, ReportService>();

        return services;
    }
}
