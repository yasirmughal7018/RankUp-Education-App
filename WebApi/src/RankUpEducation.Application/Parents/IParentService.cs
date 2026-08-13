using RankUpEducation.Contracts.Parents;

namespace RankUpEducation.Application.Parents;

public interface IParentService
{
    Task<LinkedStudentListResponse> ListLinkedStudentsAsync(CancellationToken cancellationToken);

    /// <summary>Links a student to the signed-in parent by CNIC or username.</summary>
    Task<LinkMyChildResponse> LinkMyChildAsync(
        LinkMyChildRequest request,
        CancellationToken cancellationToken);
}
