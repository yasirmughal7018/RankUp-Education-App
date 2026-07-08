using RankUpEducation.Contracts.Parents;

namespace RankUpEducation.Application.Parents;

public interface IParentService
{
    Task<LinkedStudentListResponse> ListLinkedStudentsAsync(CancellationToken cancellationToken);
}
