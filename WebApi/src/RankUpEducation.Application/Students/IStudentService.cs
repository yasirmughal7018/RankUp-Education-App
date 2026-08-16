using RankUpEducation.Contracts.Students;

namespace RankUpEducation.Application.Students;

public interface IStudentService
{
    /// <summary>Returns class placement and assigned people for the signed-in student.</summary>
    Task<StudentMeOverviewResponse> GetMyOverviewAsync(CancellationToken cancellationToken);
}
