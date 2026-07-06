using Microsoft.Extensions.Hosting;

namespace RankUpEducation.Common.Configuration;

public static class HostEnvironmentRules
{
    /// <summary>
    /// Development and automated test hosts may run without production CORS secrets.
    /// </summary>
    public static bool SkipsStrictProductionValidation(IHostEnvironment environment) =>
        environment.IsDevelopment()
        || environment.IsEnvironment("Testing");
}
