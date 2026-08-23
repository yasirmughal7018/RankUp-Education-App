using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Directory;
using RankUpEducation.Application.Teachers;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Contracts.Parents;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Students;

namespace RankUpEducation.Application.Parents;

public sealed class ParentService : IParentService
{
    private readonly ICurrentUserService _currentUser;
    private readonly IStudentScopeRepository _studentScope;
    private readonly IUserRepository _users;
    private readonly IDirectoryRepository _directory;
    private readonly ITeacherRepository _teachers;
    private readonly IUnitOfWork _unitOfWork;

    public ParentService(
        ICurrentUserService currentUser,
        IStudentScopeRepository studentScope,
        IUserRepository users,
        IDirectoryRepository directory,
        ITeacherRepository teachers,
        IUnitOfWork unitOfWork)
    {
        _currentUser = currentUser;
        _studentScope = studentScope;
        _users = users;
        _directory = directory;
        _teachers = teachers;
        _unitOfWork = unitOfWork;
    }

    public async Task<LinkedStudentListResponse> ListLinkedStudentsAsync(CancellationToken cancellationToken)
    {
        var parentId = EnsureParentId();
        var students = await _studentScope.GetLinkedStudentsAsync(parentId, cancellationToken);

        return new LinkedStudentListResponse(
            students.Select(student => new LinkedStudentResponse(
                student.StudentId,
                student.FullName,
                student.Username,
                student.RollNumber,
                student.Grade,
                student.Section,
                student.Relationship,
                student.SchoolName,
                student.CampusName,
                student.IsActive,
                student.AccountStatus)).ToArray());
    }

    public async Task<LinkMyChildResponse> LinkMyChildAsync(
        LinkMyChildRequest request,
        CancellationToken cancellationToken)
    {
        var parentId = EnsureParentId();
        if (!await _directory.ParentExistsAsync(parentId, cancellationToken))
        {
            throw new ForbiddenAppException("Parent profile was not found.");
        }

        var identifier = request.Identifier.AsTrimmedOrNull()
            ?? throw new ValidationAppException(["Enter the student’s CNIC or username."]);

        var studentUser = await ResolveStudentUserAsync(identifier, cancellationToken)
            ?? throw new NotFoundAppException(
                "No student was found with that CNIC or username.");

        if (studentUser.Id == parentId)
        {
            throw new ValidationAppException(["You cannot link your own account as a child."]);
        }

        if (!studentUser.HasRole(UserRole.Student)
            || !await _users.HasStudentProfileAsync(studentUser.Id, cancellationToken))
        {
            throw new NotFoundAppException(
                "No student was found with that CNIC or username.");
        }

        if (!studentUser.IsActive || studentUser.IsPendingRegistration || studentUser.IsRejectedRegistration)
        {
            throw new ValidationAppException([
                "That student account is not active yet. Ask the school to activate it first."]);
        }

        var alreadyLinked = await _studentScope.IsLinkedStudentAsync(
            parentId,
            studentUser.Id,
            cancellationToken);

        var relationship = request.Relationship.AsTrimmedOrDefault("Guardian");
        await _directory.LinkParentStudentAsync(
            parentId,
            studentUser.Id,
            relationship,
            cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var linked = (await _studentScope.GetLinkedStudentsAsync(parentId, cancellationToken))
            .FirstOrDefault(student => student.StudentId == studentUser.Id);

        return new LinkMyChildResponse(
            studentUser.Id,
            linked?.FullName ?? studentUser.FullName,
            linked?.Username ?? studentUser.Username,
            linked?.RollNumber ?? studentUser.RollNumberTeacherCode ?? string.Empty,
            linked?.Grade ?? 0,
            linked?.Section ?? string.Empty,
            linked?.Relationship ?? relationship,
            linked?.SchoolName,
            linked?.CampusName,
            linked?.IsActive ?? studentUser.IsActive,
            linked?.AccountStatus
                ?? DirectoryAccountStatuses.FromUser(studentUser),
            alreadyLinked);
    }

    public async Task<ParentGroupListResponse> ListMyGroupsAsync(CancellationToken cancellationToken)
    {
        var parentId = EnsureParentId();
        var groups = await _teachers.ListGroupsAsync(parentId, UserRole.Parent, cancellationToken);
        var items = new List<ParentGroupResponse>();
        foreach (var group in groups)
        {
            items.Add(await MapGroupAsync(group, cancellationToken));
        }

        return new ParentGroupListResponse(items);
    }

    public async Task<ParentGroupResponse> CreateGroupAsync(
        CreateParentGroupRequest request,
        CancellationToken cancellationToken)
    {
        var parentId = await EnsureParentProfileAsync(cancellationToken);
        var (name, description) = ValidateGroupFields(request.GroupName, request.Description);
        var group = new StudentGroup(parentId, name, description, UserRole.Parent);
        await _teachers.AddGroupAsync(group, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await MapGroupAsync(group, cancellationToken);
    }

    public async Task<ParentGroupResponse> UpdateGroupAsync(
        long groupId,
        UpdateParentGroupRequest request,
        CancellationToken cancellationToken)
    {
        var parentId = EnsureParentId();
        var group = await _teachers.GetGroupAsync(groupId, parentId, UserRole.Parent, cancellationToken)
            ?? throw new NotFoundAppException("Student group was not found.");

        var (name, description) = ValidateGroupFields(request.GroupName, request.Description);
        group.Update(name, description);
        if (!group.IsActive)
        {
            group.Activate();
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await MapGroupAsync(group, cancellationToken);
    }

    public async Task DeactivateGroupAsync(long groupId, CancellationToken cancellationToken)
    {
        var parentId = EnsureParentId();
        var group = await _teachers.GetGroupAsync(groupId, parentId, UserRole.Parent, cancellationToken)
            ?? throw new NotFoundAppException("Student group was not found.");
        group.Deactivate();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<ParentGroupResponse> AddGroupMemberAsync(
        long groupId,
        AddParentGroupMemberRequest request,
        CancellationToken cancellationToken)
    {
        var parentId = EnsureParentId();
        var group = await _teachers.GetGroupAsync(groupId, parentId, UserRole.Parent, cancellationToken)
            ?? throw new NotFoundAppException("Student group was not found.");
        if (!group.IsActive)
        {
            throw new ValidationAppException(["This group is inactive."]);
        }

        if (request.StudentId < 1)
        {
            throw new ValidationAppException(["Select a child to add."]);
        }

        if (!await _studentScope.IsLinkedStudentAsync(parentId, request.StudentId, cancellationToken))
        {
            throw new ValidationAppException(["You can only add children linked to your account."]);
        }

        if (await _teachers.IsGroupMemberAsync(groupId, request.StudentId, cancellationToken))
        {
            return await MapGroupAsync(group, cancellationToken);
        }

        await _teachers.AddGroupMemberAsync(
            new StudentGroupMember(groupId, request.StudentId),
            cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await MapGroupAsync(group, cancellationToken);
    }

    public async Task RemoveGroupMemberAsync(
        long groupId,
        long studentId,
        CancellationToken cancellationToken)
    {
        var parentId = EnsureParentId();
        _ = await _teachers.GetGroupAsync(groupId, parentId, UserRole.Parent, cancellationToken)
            ?? throw new NotFoundAppException("Student group was not found.");
        await _teachers.RemoveGroupMemberAsync(groupId, studentId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static (string Name, string Description) ValidateGroupFields(
        string? groupName,
        string? description)
    {
        var name = groupName.AsTrimmedOrNull()
            ?? throw new ValidationAppException(["Group name is required."]);
        if (name.Length > 50)
        {
            throw new ValidationAppException(["Group name must be 50 characters or fewer."]);
        }

        var trimmedDescription = description.AsTrimmedOrDefault(string.Empty);
        if (trimmedDescription.Length > 200)
        {
            throw new ValidationAppException(["Description must be 200 characters or fewer."]);
        }

        return (name, trimmedDescription);
    }

    private async Task<ParentGroupResponse> MapGroupAsync(
        StudentGroup group,
        CancellationToken cancellationToken)
    {
        var members = await _teachers.GetGroupMembersAsync(group.Id, cancellationToken);
        return new ParentGroupResponse(
            group.Id,
            group.GroupName,
            group.Description,
            group.IsActive,
            members.Count,
            members.Select(member => new ParentGroupMemberResponse(
                member.StudentId,
                member.FullName,
                member.Username,
                member.RollNumber,
                member.Grade,
                member.Section)).ToArray());
    }

    private async Task<long> EnsureParentProfileAsync(CancellationToken cancellationToken)
    {
        var parentId = EnsureParentId();
        if (!await _directory.ParentExistsAsync(parentId, cancellationToken))
        {
            throw new ForbiddenAppException("Parent profile was not found.");
        }

        return parentId;
    }

    private long EnsureParentId()
    {
        if (!string.Equals(_currentUser.Role, nameof(UserRole.Parent), StringComparison.OrdinalIgnoreCase))
        {
            throw new ForbiddenAppException("Only parents can manage linked children.");
        }

        return _currentUser.ProfileId
            ?? _currentUser.UserId
            ?? throw new ForbiddenAppException("Parent profile was not found.");
    }

    private async Task<User?> ResolveStudentUserAsync(
        string identifier,
        CancellationToken cancellationToken)
    {
        // Prefer exact CNIC match when the token looks like a CNIC; also try username (email).
        var byCnic = await _users.GetByCnicAsync(identifier, cancellationToken);
        if (byCnic is not null)
        {
            return byCnic;
        }

        return await _users.GetByUsernameAsync(identifier, cancellationToken);
    }
}
