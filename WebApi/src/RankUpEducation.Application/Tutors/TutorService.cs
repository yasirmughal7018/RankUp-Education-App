using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Directory;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Contracts.Tutors;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Tutors;

public sealed class TutorService : ITutorService
{
    private readonly ICurrentUserService _currentUser;
    private readonly IStudentScopeRepository _studentScope;
    private readonly IUserRepository _users;
    private readonly IDirectoryRepository _directory;
    private readonly IUnitOfWork _unitOfWork;

    public TutorService(
        ICurrentUserService currentUser,
        IStudentScopeRepository studentScope,
        IUserRepository users,
        IDirectoryRepository directory,
        IUnitOfWork unitOfWork)
    {
        _currentUser = currentUser;
        _studentScope = studentScope;
        _users = users;
        _directory = directory;
        _unitOfWork = unitOfWork;
    }

    public async Task<TutorLinkedStudentListResponse> ListLinkedStudentsAsync(CancellationToken cancellationToken)
    {
        var tutorId = EnsureTutorId();
        var students = await _studentScope.GetTutorLinkedStudentsAsync(tutorId, cancellationToken);

        return new TutorLinkedStudentListResponse(
            students.Select(student => new TutorLinkedStudentResponse(
                student.StudentId,
                student.FullName,
                student.Username,
                student.RollNumber,
                student.Grade,
                student.Section,
                student.SchoolName)).ToArray());
    }

    public async Task<LinkTutorStudentResponse> LinkStudentAsync(
        LinkTutorStudentRequest request,
        CancellationToken cancellationToken)
    {
        var tutorId = EnsureTutorId();
        if (!await _directory.TutorExistsAsync(tutorId, cancellationToken))
        {
            throw new ForbiddenAppException("Tutor profile was not found.");
        }

        var identifier = request.Identifier.AsTrimmedOrNull()
            ?? throw new ValidationAppException(["Enter the student’s CNIC or username."]);

        var studentUser = await ResolveStudentUserAsync(identifier, cancellationToken)
            ?? throw new NotFoundAppException(
                "No student was found with that CNIC or username.");

        if (studentUser.Id == tutorId)
        {
            throw new ValidationAppException(["You cannot link your own account as a student."]);
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

        var alreadyLinked = await _studentScope.IsTutorLinkedStudentAsync(
            tutorId,
            studentUser.Id,
            cancellationToken);

        await _directory.LinkTutorStudentAsync(tutorId, studentUser.Id, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var linked = (await _studentScope.GetTutorLinkedStudentsAsync(tutorId, cancellationToken))
            .FirstOrDefault(student => student.StudentId == studentUser.Id);

        return new LinkTutorStudentResponse(
            studentUser.Id,
            linked?.FullName ?? studentUser.FullName,
            linked?.Username ?? studentUser.Username,
            linked?.RollNumber ?? studentUser.RollNumberTeacherCode ?? string.Empty,
            linked?.Grade ?? 0,
            linked?.Section ?? string.Empty,
            linked?.SchoolName,
            alreadyLinked);
    }

    public async Task UnlinkStudentAsync(long studentId, CancellationToken cancellationToken)
    {
        var tutorId = EnsureTutorId();
        if (studentId <= 0)
        {
            throw new NotFoundAppException("Student was not found.");
        }

        if (!await _studentScope.IsTutorLinkedStudentAsync(tutorId, studentId, cancellationToken))
        {
            throw new NotFoundAppException("That student is not linked to your account.");
        }

        await _directory.UnlinkTutorStudentAsync(tutorId, studentId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private long EnsureTutorId()
    {
        if (!string.Equals(_currentUser.Role, nameof(UserRole.Tutor), StringComparison.OrdinalIgnoreCase))
        {
            throw new ForbiddenAppException("Only tutors can manage linked students.");
        }

        return _currentUser.ProfileId
            ?? _currentUser.UserId
            ?? throw new ForbiddenAppException("Tutor profile was not found.");
    }

    private async Task<User?> ResolveStudentUserAsync(
        string identifier,
        CancellationToken cancellationToken)
    {
        var byCnic = await _users.GetByCnicAsync(identifier, cancellationToken);
        if (byCnic is not null)
        {
            return byCnic;
        }

        return await _users.GetByUsernameAsync(identifier, cancellationToken);
    }
}
