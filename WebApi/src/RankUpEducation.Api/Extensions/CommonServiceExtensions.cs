using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using RankUpEducation.Common.Configuration;

namespace RankUpEducation.Api.Extensions;

public static class CommonServiceExtensions
{
    public static IServiceCollection AddRankUpCommonConfiguration(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment,
        string? databaseConnectionString)
    {
        services.Configure<RateLimitingOptions>(configuration.GetSection(RateLimitingOptions.SectionName));
        services.Configure<HealthCheckEndpointOptions>(configuration.GetSection(HealthCheckEndpointOptions.SectionName));

        var corsOptions = configuration.GetSection(CorsOptions.SectionName).Get<CorsOptions>() ?? new CorsOptions();
        var normalizedOrigins = CorsProductionRules.NormalizeOrigins(corsOptions.AllowedOrigins);

        var corsValidationErrors = HostEnvironmentRules.SkipsStrictProductionValidation(environment)
            ? CorsProductionRules.ValidateConfiguredOrigins(normalizedOrigins)
            : CorsProductionRules.ValidateProduction(normalizedOrigins);

        if (corsValidationErrors.Count > 0)
        {
            throw new InvalidOperationException(string.Join(' ', corsValidationErrors));
        }

        services.AddSingleton(normalizedOrigins);
        services.AddCors(options =>
        {
            options.AddPolicy(CorsOptions.PolicyName, policy =>
            {
                if (normalizedOrigins.Length == 0)
                {
                    policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
                }
                else
                {
                    policy.WithOrigins(normalizedOrigins).AllowAnyHeader().AllowAnyMethod();
                }
            });
        });

        var rateOptions = configuration.GetSection(RateLimitingOptions.SectionName).Get<RateLimitingOptions>()
            ?? new RateLimitingOptions();

        services.AddRateLimiter(limiterOptions =>
        {
            limiterOptions.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            limiterOptions.AddFixedWindowLimiter("Auth", ConfigureWindow(rateOptions.AuthPermitLimit, rateOptions.AuthWindowSeconds));
            limiterOptions.AddFixedWindowLimiter("Login", ConfigureWindow(rateOptions.LoginPermitLimit, rateOptions.LoginWindowSeconds));
            limiterOptions.AddFixedWindowLimiter("UsersAnonymous", ConfigureWindow(rateOptions.UsersAnonymousPermitLimit, rateOptions.UsersAnonymousWindowSeconds));
            limiterOptions.AddFixedWindowLimiter("ChangePassword", ConfigureWindow(rateOptions.ChangePasswordPermitLimit, rateOptions.ChangePasswordWindowSeconds));
        });

        var healthChecks = services.AddHealthChecks();
        if (!string.IsNullOrWhiteSpace(databaseConnectionString))
        {
            healthChecks.AddNpgSql(
                databaseConnectionString,
                name: "postgresql",
                failureStatus: HealthStatus.Unhealthy,
                tags: ["ready", "db"]);
        }

        return services;
    }

    public static WebApplication MapRankUpHealthChecks(
        this WebApplication app,
        IConfiguration configuration)
    {
        var options = configuration.GetSection(HealthCheckEndpointOptions.SectionName).Get<HealthCheckEndpointOptions>()
            ?? new HealthCheckEndpointOptions();

        if (!options.Enabled)
        {
            return app;
        }

        var livePath = HealthCheckEndpointRules.NormalizePath(options.LivePath, "/health/live");
        var readyPath = HealthCheckEndpointRules.NormalizePath(options.ReadyPath, "/health/ready");
        var detailedPath = HealthCheckEndpointRules.NormalizePath(options.DetailedPath, "/health");

        app.MapHealthChecks(livePath, new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
        {
            Predicate = _ => false
        });

        app.MapHealthChecks(readyPath, new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
        {
            Predicate = registration => registration.Tags.Contains("ready")
        });

        app.MapHealthChecks(detailedPath);

        return app;
    }

    private static Action<FixedWindowRateLimiterOptions> ConfigureWindow(int permitLimit, int windowSeconds)
    {
        return options =>
        {
            options.PermitLimit = Math.Max(1, permitLimit);
            options.Window = TimeSpan.FromSeconds(Math.Max(1, windowSeconds));
            options.QueueLimit = 0;
            options.AutoReplenishment = true;
        };
    }
}
