using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Directory;
using RankUpEducation.Application.Reports;
using RankUpEducation.Infrastructure.Authentication;
using RankUpEducation.Infrastructure.Common;
using RankUpEducation.Infrastructure.Persistence;
using RankUpEducation.Infrastructure.Persistence.Repositories;

namespace RankUpEducation.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.AddHttpContextAccessor();

        services.AddScoped<IDateTimeProvider, SystemDateTimeProvider>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ISchoolChangeRequestRepository, SchoolChangeRequestRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<ILookupRepository, LookupRepository>();
        services.AddScoped<IQuestionRepository, QuestionRepository>();
        services.AddScoped<IQuizQuestionRepository, QuizQuestionRepository>();
        services.AddScoped<IQuizRepository, QuizRepository>();
        services.AddScoped<IQuizAssignmentRepository, QuizAssignmentRepository>();
        services.AddScoped<IQuizAttemptRepository, QuizAttemptRepository>();
        services.AddScoped<IQuizReviewRepository, QuizReviewRepository>();
        services.AddScoped<IStudentScopeRepository, StudentScopeRepository>();
        services.AddScoped<IDirectoryRepository, DirectoryRepository>();
        services.AddScoped<IReportRepository, ReportRepository>();
        services.AddScoped<IUnitOfWork>(provider => provider.GetRequiredService<RankUpDbContext>());
        services.AddScoped<IApiSupportSchemaInitializer, ApiSupportSchemaInitializer>();

        var providerName = configuration.GetValue<string>("Database:Provider") ?? "PostgreSql";
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=rankup_education;Username=postgres;Password=CHANGE_ME";

        if (providerName.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase))
        {
            services.AddDbContext<RankUpDbContext>(options => options.UseNpgsql(connectionString));
        }
        else
        {
            throw new InvalidOperationException($"Database provider '{providerName}' is not configured yet.");
        }

        return services;
    }
}
