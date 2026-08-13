using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Contracts.Teachers;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Students;

namespace RankUpEducation.Application.Teachers;

public interface ITeacherService
{
    Task<TeacherRosterListResponse> GetMyRosterAsync(CancellationToken cancellationToken);

    Task<TeacherGroupListResponse> ListMyGroupsAsync(CancellationToken cancellationToken);

    Task<TeacherGroupResponse> CreateGroupAsync(
        CreateTeacherGroupRequest request,
        CancellationToken cancellationToken);

    Task<TeacherGroupResponse> UpdateGroupAsync(
        long groupId,
        UpdateTeacherGroupRequest request,
        CancellationToken cancellationToken);

    Task DeactivateGroupAsync(long groupId, CancellationToken cancellationToken);

    Task<TeacherGroupResponse> AddGroupMemberAsync(
        long groupId,
        AddTeacherGroupMemberRequest request,
        CancellationToken cancellationToken);

    Task RemoveGroupMemberAsync(
        long groupId,
        long studentId,
        CancellationToken cancellationToken);
}

public sealed class TeacherService : ITeacherService
{
    private readonly ICurrentUserService _currentUser;
    private readonly IUserRepository _users;
    private readonly ITeacherRepository _teachers;
    private readonly IUnitOfWork _unitOfWork;

    public TeacherService(
        ICurrentUserService currentUser,
        IUserRepository users,
        ITeacherRepository teachers,
        IUnitOfWork unitOfWork)
    {
        _currentUser = currentUser;
        _users = users;
        _teachers = teachers;
        _unitOfWork = unitOfWork;
    }

    public async Task<TeacherRosterListResponse> GetMyRosterAsync(CancellationToken cancellationToken)
    {
        var (teacherId, schoolId, campusId) = await EnsureTeacherContextAsync(cancellationToken);
        var classSections = await _teachers.GetClassSectionsAsync(teacherId, cancellationToken);
        var students = await _teachers.GetRosterStudentsAsync(teacherId, schoolId, campusId, cancellationToken);
        return new TeacherRosterListResponse(classSections, students);
    }

    public async Task<TeacherGroupListResponse> ListMyGroupsAsync(CancellationToken cancellationToken)
    {
        var (teacherId, _, _) = await EnsureTeacherContextAsync(cancellationToken);
        var groups = await _teachers.ListGroupsAsync(teacherId, cancellationToken);
        var items = new List<TeacherGroupResponse>();
        foreach (var group in groups)
        {
            items.Add(await MapGroupAsync(group, cancellationToken));
        }

        return new TeacherGroupListResponse(items);
    }

    public async Task<TeacherGroupResponse> CreateGroupAsync(
        CreateTeacherGroupRequest request,
        CancellationToken cancellationToken)
    {
        var (teacherId, _, _) = await EnsureTeacherContextAsync(cancellationToken);
        var name = request.GroupName.AsTrimmedOrNull()
            ?? throw new ValidationAppException(["Group name is required."]);
        if (name.Length > 50)
        {
            throw new ValidationAppException(["Group name must be 50 characters or fewer."]);
        }

        var description = request.Description.AsTrimmedOrDefault(string.Empty);
        if (description.Length > 200)
        {
            throw new ValidationAppException(["Description must be 200 characters or fewer."]);
        }

        var group = new StudentGroup(teacherId, name, description, UserRole.Teacher);
        await _teachers.AddGroupAsync(group, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await MapGroupAsync(group, cancellationToken);
    }

    public async Task<TeacherGroupResponse> UpdateGroupAsync(
        long groupId,
        UpdateTeacherGroupRequest request,
        CancellationToken cancellationToken)
    {
        var (teacherId, _, _) = await EnsureTeacherContextAsync(cancellationToken);
        var group = await _teachers.GetGroupAsync(groupId, teacherId, cancellationToken)
            ?? throw new NotFoundAppException("Student group was not found.");

        var name = request.GroupName.AsTrimmedOrNull()
            ?? throw new ValidationAppException(["Group name is required."]);
        if (name.Length > 50)
        {
            throw new ValidationAppException(["Group name must be 50 characters or fewer."]);
        }

        var description = request.Description.AsTrimmedOrDefault(string.Empty);
        if (description.Length > 200)
        {
            throw new ValidationAppException(["Description must be 200 characters or fewer."]);
        }

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
        var (teacherId, _, _) = await EnsureTeacherContextAsync(cancellationToken);
        var group = await _teachers.GetGroupAsync(groupId, teacherId, cancellationToken)
            ?? throw new NotFoundAppException("Student group was not found.");
        group.Deactivate();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<TeacherGroupResponse> AddGroupMemberAsync(
        long groupId,
        AddTeacherGroupMemberRequest request,
        CancellationToken cancellationToken)
    {
        var (teacherId, schoolId, campusId) = await EnsureTeacherContextAsync(cancellationToken);
        var group = await _teachers.GetGroupAsync(groupId, teacherId, cancellationToken)
            ?? throw new NotFoundAppException("Student group was not found.");
        if (!group.IsActive)
        {
            throw new ValidationAppException(["This group is inactive."]);
        }

        if (request.StudentId < 1)
        {
            throw new ValidationAppException(["Select a student to add."]);
        }

        if (!await _teachers.IsStudentInRosterAsync(
                teacherId,
                request.StudentId,
                schoolId,
                campusId,
                cancellationToken))
        {
            throw new ValidationAppException([
                "You can only add students from your assigned classes and sections."]);
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
        var (teacherId, _, _) = await EnsureTeacherContextAsync(cancellationToken);
        _ = await _teachers.GetGroupAsync(groupId, teacherId, cancellationToken)
            ?? throw new NotFoundAppException("Student group was not found.");
        await _teachers.RemoveGroupMemberAsync(groupId, studentId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<(long TeacherId, int SchoolId, int CampusId)> EnsureTeacherContextAsync(
        CancellationToken cancellationToken)
    {
        if (!string.Equals(_currentUser.Role, nameof(UserRole.Teacher), StringComparison.OrdinalIgnoreCase)
            && !string.Equals(_currentUser.Role, nameof(UserRole.Coordinator), StringComparison.OrdinalIgnoreCase))
        {
            throw new ForbiddenAppException("Only teachers can manage their class roster and groups.");
        }

        var teacherId = _currentUser.ProfileId
            ?? _currentUser.UserId
            ?? throw new ForbiddenAppException("Teacher profile was not found.");

        var user = await _users.GetByIdAsync(teacherId, cancellationToken)
            ?? throw new ForbiddenAppException("Teacher profile was not found.");

        if (user.SchoolId is null || user.CampusId is null)
        {
            throw new ValidationAppException([
                "Your account needs a school and campus before managing students."]);
        }

        return (teacherId, user.SchoolId.Value, user.CampusId.Value);
    }

    private async Task<TeacherGroupResponse> MapGroupAsync(
        StudentGroup group,
        CancellationToken cancellationToken)
    {
        var members = await _teachers.GetGroupMembersAsync(group.Id, cancellationToken);
        return new TeacherGroupResponse(
            group.Id,
            group.GroupName,
            group.Description,
            group.IsActive,
            members.Count,
            members);
    }
}
