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
using RankUpEducation.Application.Students;
using RankUpEducation.Application.Teachers;
using RankUpEducation.Application.Tutors;

namespace RankUpEducation.Application;

/// <summary>Registers application-layer services with the DI container.</summary>
public static class DependencyInjection
{
    /// <summary>Adds RankUp application services as scoped dependencies.</summary>
    public static IServiceCollection AddApplication(
        this IServiceCollection services,
        Microsoft.Extensions.Configuration.IConfiguration? configuration = null)
    {
        if (configuration is not null)
        {
            services.Configure<QuizAiOptions>(configuration.GetSection(QuizAiOptions.SectionName));
        }
        else
        {
            services.AddOptions<QuizAiOptions>();
        }

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
        services.AddScoped<HeuristicQuizAiReviewService>();
        services.AddHttpClient<OpenAiQuizAiReviewService>();
        services.AddScoped<IQuizAiReviewService>(sp =>
        {
            var options = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<QuizAiOptions>>().Value;
            if (options.Enabled && !string.IsNullOrWhiteSpace(options.ApiKey))
            {
                return sp.GetRequiredService<OpenAiQuizAiReviewService>();
            }

            return sp.GetRequiredService<HeuristicQuizAiReviewService>();
        });
        services.AddScoped<ILookupService, LookupService>();
        services.AddScoped<IParentService, ParentService>();
        services.AddScoped<ITutorService, TutorService>();
        services.AddScoped<ITeacherService, TeacherService>();
        services.AddScoped<IStudentService, StudentService>();
        services.AddScoped<IDirectoryService, DirectoryService>();
        services.AddScoped<IReportService, ReportService>();

        return services;
    }
}
