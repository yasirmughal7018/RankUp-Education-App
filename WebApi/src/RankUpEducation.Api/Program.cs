using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using RankUpEducation.Api.Extensions;
using RankUpEducation.Api.Integrations;
using RankUpEducation.Api.Middleware;
using RankUpEducation.Application;
using RankUpEducation.Common.Configuration;
using RankUpEducation.Infrastructure;
using RankUpEducation.Infrastructure.Authentication;
using RankUpEducation.Infrastructure.Persistence;

// RankUp Education API host: controllers, JWT auth, EF Core, and integration fallbacks.
var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "RankUp Education API",
        Version = "v1",
        Description = "Backend API for RankUp Education mobile and web clients."
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter a JWT access token. Example: Bearer eyJhbGciOi..."
    });

    options.AddSecurityRequirement(_ => new OpenApiSecurityRequirement
    {
        [
            new OpenApiSecuritySchemeReference("Bearer", null)
        ] = []
    });
});

builder.Services.AddRankUpCommonConfiguration(
    builder.Configuration,
    builder.Environment,
    connectionString);

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApiIntegrationFallbacks();

var app = builder.Build();

// Ensure auth/support tables exist before serving traffic.
using (var scope = app.Services.CreateScope())
{
    var schemaInitializer = scope.ServiceProvider.GetRequiredService<IApiSupportSchemaInitializer>();
    await schemaInitializer.EnsureCreatedAsync(CancellationToken.None);
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "RankUp Education API v1");
    options.DocumentTitle = "RankUp Education API";
});
app.UseCors(CorsOptions.PolicyName);
app.UseStaticFiles();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapRankUpHealthChecks(builder.Configuration);

app.Run();
