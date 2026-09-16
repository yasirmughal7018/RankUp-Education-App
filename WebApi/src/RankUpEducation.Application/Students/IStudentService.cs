using RankUpEducation.Contracts.Students;

namespace RankUpEducation.Application.Students;

public interface IStudentService
{
    /// <summary>Returns class placement and assigned people for the signed-in student.</summary>
    Task<StudentMeOverviewResponse> GetMyOverviewAsync(CancellationToken cancellationToken);

    /// <summary>Returns class/section placement history for the signed-in student (newest first).</summary>
    Task<StudentClassHistoryResponse> GetMyClassHistoryAsync(CancellationToken cancellationToken);
}
