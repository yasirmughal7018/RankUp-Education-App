using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Directory;
using RankUpEducation.Contracts.Students;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Students;

public sealed class StudentService : IStudentService
{
    private readonly ICurrentUserService _currentUser;
    private readonly IStudentScopeRepository _studentScope;
    private readonly IDirectoryRepository _directory;

    public StudentService(
        ICurrentUserService currentUser,
        IStudentScopeRepository studentScope,
        IDirectoryRepository directory)
    {
        _currentUser = currentUser;
        _studentScope = studentScope;
        _directory = directory;
    }

    public async Task<StudentMeOverviewResponse> GetMyOverviewAsync(CancellationToken cancellationToken)
    {
        var studentId = EnsureStudentId();

        if (!await _directory.StudentExistsAsync(studentId, cancellationToken))
        {
            throw new NotFoundAppException("Student profile was not found.");
        }

        var classInfo = await _studentScope.GetStudentMeClassAsync(studentId, cancellationToken)
            ?? throw new NotFoundAppException("Student profile was not found.");

        var people = await _directory.GetAssignedPeopleForStudentAsync(studentId, cancellationToken);

        return new StudentMeOverviewResponse(
            classInfo.FullName,
            classInfo.Username,
            classInfo.RollNumber,
            classInfo.Grade,
            classInfo.Section,
            classInfo.SchoolName,
            classInfo.CampusName,
            MapPeople(people.Parents),
            MapPeople(people.Coordinators),
            MapPeople(people.Teachers),
            MapPeople(people.Tutors));
    }

    private static IReadOnlyList<StudentMePersonResponse> MapPeople(
        IReadOnlyList<StudentAssignedPerson> people)
    {
        return people
            .Select(person => new StudentMePersonResponse(person.FullName, person.Detail))
            .ToArray();
    }

    private long EnsureStudentId()
    {
        if (!string.Equals(_currentUser.Role, nameof(UserRole.Student), StringComparison.OrdinalIgnoreCase))
        {
            throw new ForbiddenAppException("Only students can view their class and assigned people.");
        }

        return _currentUser.ProfileId
            ?? _currentUser.UserId
            ?? throw new ForbiddenAppException("Student profile was not found.");
    }
}
