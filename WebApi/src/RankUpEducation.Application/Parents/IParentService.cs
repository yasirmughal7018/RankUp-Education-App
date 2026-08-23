using RankUpEducation.Contracts.Parents;

namespace RankUpEducation.Application.Parents;

public interface IParentService
{
    Task<LinkedStudentListResponse> ListLinkedStudentsAsync(CancellationToken cancellationToken);

    /// <summary>Links a student to the signed-in parent by CNIC or username.</summary>
    Task<LinkMyChildResponse> LinkMyChildAsync(
        LinkMyChildRequest request,
        CancellationToken cancellationToken);

    Task<ParentGroupListResponse> ListMyGroupsAsync(CancellationToken cancellationToken);

    Task<ParentGroupResponse> CreateGroupAsync(
        CreateParentGroupRequest request,
        CancellationToken cancellationToken);

    Task<ParentGroupResponse> UpdateGroupAsync(
        long groupId,
        UpdateParentGroupRequest request,
        CancellationToken cancellationToken);

    Task DeactivateGroupAsync(long groupId, CancellationToken cancellationToken);

    Task<ParentGroupResponse> AddGroupMemberAsync(
        long groupId,
        AddParentGroupMemberRequest request,
        CancellationToken cancellationToken);

    Task RemoveGroupMemberAsync(
        long groupId,
        long studentId,
        CancellationToken cancellationToken);
}
