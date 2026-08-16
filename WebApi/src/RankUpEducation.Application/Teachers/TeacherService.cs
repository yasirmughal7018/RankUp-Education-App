using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Coordinators;
using RankUpEducation.Application.Directory;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Contracts.Directory;
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

    /// <summary>Adds an existing student to one of the teacher's assigned class/section pairs.</summary>
    Task<AddMyStudentResponse> AddMyStudentAsync(
        AddMyStudentRequest request,
        CancellationToken cancellationToken);
}

public sealed class TeacherService : ITeacherService
{
    private readonly ICurrentUserService _currentUser;
    private readonly IUserRepository _users;
    private readonly ITeacherRepository _teachers;
    private readonly ICoordinatorRepository _coordinators;
    private readonly IDirectoryRepository _directory;
    private readonly IUnitOfWork _unitOfWork;

    public TeacherService(
        ICurrentUserService currentUser,
        IUserRepository users,
        ITeacherRepository teachers,
        ICoordinatorRepository coordinators,
        IDirectoryRepository directory,
        IUnitOfWork unitOfWork)
    {
        _currentUser = currentUser;
        _users = users;
        _teachers = teachers;
        _coordinators = coordinators;
        _directory = directory;
        _unitOfWork = unitOfWork;
    }

    public async Task<TeacherRosterListResponse> GetMyRosterAsync(CancellationToken cancellationToken)
    {
        var (userId, schoolId, campusId) = await EnsureTeacherOrCoordinatorContextAsync(cancellationToken);

        if (IsActingAsCoordinator())
        {
            var coordinatorGrades = await _coordinators.GetClassSectionsAsync(userId, cancellationToken);
            var grades = coordinatorGrades.Select(item => item.Grade).Distinct().ToArray();
            var students = await _teachers.GetRosterStudentsByGradesAsync(
                schoolId,
                campusId,
                grades,
                cancellationToken);
            var classSections = BuildCoordinatorClassSectionItems(coordinatorGrades, students);
            return new TeacherRosterListResponse(classSections, students);
        }

        var teacherSections = await _teachers.GetClassSectionsAsync(userId, cancellationToken);
        var teacherStudents = await _teachers.GetRosterStudentsAsync(
            userId,
            schoolId,
            campusId,
            cancellationToken);
        return new TeacherRosterListResponse(teacherSections, teacherStudents);
    }

    public async Task<TeacherGroupListResponse> ListMyGroupsAsync(CancellationToken cancellationToken)
    {
        var (userId, _, _) = await EnsureTeacherOrCoordinatorContextAsync(cancellationToken);
        var creatorRole = ActiveCreatorRole();
        var groups = await _teachers.ListGroupsAsync(userId, creatorRole, cancellationToken);
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
        var (userId, _, _) = await EnsureTeacherOrCoordinatorContextAsync(cancellationToken);
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

        var creatorRole = ActiveCreatorRole();
        var group = new StudentGroup(userId, name, description, creatorRole);
        await _teachers.AddGroupAsync(group, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await MapGroupAsync(group, cancellationToken);
    }

    public async Task<TeacherGroupResponse> UpdateGroupAsync(
        long groupId,
        UpdateTeacherGroupRequest request,
        CancellationToken cancellationToken)
    {
        var (userId, _, _) = await EnsureTeacherOrCoordinatorContextAsync(cancellationToken);
        var group = await _teachers.GetGroupAsync(groupId, userId, ActiveCreatorRole(), cancellationToken)
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
        var (userId, _, _) = await EnsureTeacherOrCoordinatorContextAsync(cancellationToken);
        var group = await _teachers.GetGroupAsync(groupId, userId, ActiveCreatorRole(), cancellationToken)
            ?? throw new NotFoundAppException("Student group was not found.");
        group.Deactivate();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<TeacherGroupResponse> AddGroupMemberAsync(
        long groupId,
        AddTeacherGroupMemberRequest request,
        CancellationToken cancellationToken)
    {
        var (userId, schoolId, campusId) = await EnsureTeacherOrCoordinatorContextAsync(cancellationToken);
        var group = await _teachers.GetGroupAsync(groupId, userId, ActiveCreatorRole(), cancellationToken)
            ?? throw new NotFoundAppException("Student group was not found.");
        if (!group.IsActive)
        {
            throw new ValidationAppException(["This group is inactive."]);
        }

        if (request.StudentId < 1)
        {
            throw new ValidationAppException(["Select a student to add."]);
        }

        if (!await IsStudentInActiveRosterAsync(
                userId,
                request.StudentId,
                schoolId,
                campusId,
                cancellationToken))
        {
            throw new ValidationAppException([
                "You can only add students from your current role’s class roster."]);
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
        var (userId, _, _) = await EnsureTeacherOrCoordinatorContextAsync(cancellationToken);
        _ = await _teachers.GetGroupAsync(groupId, userId, ActiveCreatorRole(), cancellationToken)
            ?? throw new NotFoundAppException("Student group was not found.");
        await _teachers.RemoveGroupMemberAsync(groupId, studentId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<AddMyStudentResponse> AddMyStudentAsync(
        AddMyStudentRequest request,
        CancellationToken cancellationToken)
    {
        var (userId, schoolId, campusId) = await EnsureTeacherOrCoordinatorContextAsync(cancellationToken);
        var identifier = request.Identifier.AsTrimmedOrNull()
            ?? throw new ValidationAppException(["Enter the student’s CNIC or username."]);

        var section = request.Section.AsTrimmedOrNull()
            ?? throw new ValidationAppException(["Select a class and section."]);
        if (request.Grade <= 0)
        {
            throw new ValidationAppException(["Select a class and section."]);
        }

        short targetGrade;
        string targetSection;

        if (IsActingAsCoordinator())
        {
            var coordinatorGrades = await _coordinators.GetClassSectionsAsync(userId, cancellationToken);
            if (coordinatorGrades.Count == 0)
            {
                throw new ValidationAppException([
                    "Ask an admin to assign your coordinator grades before adding students."]);
            }

            if (!coordinatorGrades.Any(item => item.Grade == request.Grade))
            {
                throw new ValidationAppException([
                    "That grade is not one of your assigned coordinator grades."]);
            }

            targetGrade = request.Grade;
            targetSection = section;
        }
        else
        {
            var classSections = await _teachers.GetClassSectionsAsync(userId, cancellationToken);
            if (classSections.Count == 0)
            {
                throw new ValidationAppException([
                    "Ask an admin to assign your classes and sections before adding students."]);
            }

            var target = classSections.FirstOrDefault(item =>
                item.Grade == request.Grade
                && string.Equals(item.Section, section, StringComparison.OrdinalIgnoreCase));
            if (target is null)
            {
                throw new ValidationAppException([
                    "You can only add students to classes and sections assigned to you."]);
            }

            targetGrade = target.Grade;
            targetSection = target.Section;
        }

        var studentUser = await _users.GetByCnicAsync(identifier, cancellationToken)
            ?? await _users.GetByUsernameAsync(identifier, cancellationToken)
            ?? throw new NotFoundAppException("No student was found with that CNIC or username.");

        if (studentUser.Id == userId)
        {
            throw new ValidationAppException(["You cannot add your own account as a student."]);
        }

        if (!studentUser.HasRole(UserRole.Student)
            || !await _users.HasStudentProfileAsync(studentUser.Id, cancellationToken))
        {
            throw new NotFoundAppException("No student was found with that CNIC or username.");
        }

        if (!studentUser.IsActive || studentUser.IsPendingRegistration || studentUser.IsRejectedRegistration)
        {
            throw new ValidationAppException([
                "That student account is not active yet. Ask the school to activate it first."]);
        }

        if (studentUser.SchoolId is not null && studentUser.SchoolId != schoolId)
        {
            throw new ValidationAppException(["That student belongs to a different school."]);
        }

        if (studentUser.CampusId is not null && studentUser.CampusId != campusId)
        {
            throw new ValidationAppException(["That student belongs to a different campus."]);
        }

        var student = await _directory.GetStudentEntityAsync(studentUser.Id, cancellationToken)
            ?? throw new NotFoundAppException("No student was found with that CNIC or username.");

        var alreadyOnRoster =
            student.Grade == targetGrade
            && string.Equals(student.Section, targetSection, StringComparison.OrdinalIgnoreCase)
            && studentUser.SchoolId == schoolId
            && studentUser.CampusId == campusId;

        if (!alreadyOnRoster)
        {
            student.Update(targetGrade, targetSection, student.MobileNumber ?? studentUser.MobileNumber);
            if (studentUser.SchoolId != schoolId || studentUser.CampusId != campusId)
            {
                studentUser.AssignSchoolCampus(schoolId, campusId);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return new AddMyStudentResponse(
            studentUser.Id,
            studentUser.FullName,
            studentUser.Username,
            studentUser.RollNumberTeacherCode ?? string.Empty,
            targetGrade,
            targetSection,
            alreadyOnRoster);
    }

    private async Task<bool> IsStudentInActiveRosterAsync(
        long userId,
        long studentId,
        int schoolId,
        int campusId,
        CancellationToken cancellationToken)
    {
        if (IsActingAsCoordinator())
        {
            var grades = (await _coordinators.GetClassSectionsAsync(userId, cancellationToken))
                .Select(item => item.Grade)
                .Distinct()
                .ToArray();
            var roster = await _teachers.GetRosterStudentsByGradesAsync(
                schoolId,
                campusId,
                grades,
                cancellationToken);
            return roster.Any(student => student.StudentId == studentId);
        }

        return await _teachers.IsStudentInRosterAsync(
            userId,
            studentId,
            schoolId,
            campusId,
            cancellationToken);
    }

    private static IReadOnlyList<TeacherClassSectionItem> BuildCoordinatorClassSectionItems(
        IReadOnlyList<CoordinatorClassSectionItem> grades,
        IReadOnlyList<TeacherRosterStudentResponse> students)
    {
        var result = new List<TeacherClassSectionItem>();
        foreach (var gradeItem in grades.OrderBy(item => item.Grade))
        {
            var sections = students
                .Where(student => student.Grade == gradeItem.Grade)
                .Select(student => student.Section.Trim())
                .Where(section => section.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(section => section, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            if (sections.Length == 0)
            {
                result.Add(new TeacherClassSectionItem(gradeItem.Grade, string.Empty));
            }
            else
            {
                result.AddRange(
                    sections.Select(section => new TeacherClassSectionItem(gradeItem.Grade, section)));
            }
        }

        return result;
    }

    private bool IsActingAsCoordinator()
        => string.Equals(
            _currentUser.Role,
            nameof(UserRole.Coordinator),
            StringComparison.OrdinalIgnoreCase);

    private UserRole ActiveCreatorRole()
        => IsActingAsCoordinator() ? UserRole.Coordinator : UserRole.Teacher;

    private async Task<(long UserId, int SchoolId, int CampusId)> EnsureTeacherOrCoordinatorContextAsync(
        CancellationToken cancellationToken)
    {
        if (!string.Equals(_currentUser.Role, nameof(UserRole.Teacher), StringComparison.OrdinalIgnoreCase)
            && !string.Equals(_currentUser.Role, nameof(UserRole.Coordinator), StringComparison.OrdinalIgnoreCase))
        {
            throw new ForbiddenAppException(
                "Only teachers or coordinators can manage their class roster and groups.");
        }

        var userId = _currentUser.ProfileId
            ?? _currentUser.UserId
            ?? throw new ForbiddenAppException("Profile was not found.");

        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new ForbiddenAppException("Profile was not found.");

        if (user.SchoolId is null || user.CampusId is null)
        {
            throw new ValidationAppException([
                "Your account needs a school and campus before managing students."]);
        }

        return (userId, user.SchoolId.Value, user.CampusId.Value);
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
