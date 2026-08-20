using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Directory;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Contracts.Parents;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Parents;

public sealed class ParentService : IParentService
{
    private readonly ICurrentUserService _currentUser;
    private readonly IStudentScopeRepository _studentScope;
    private readonly IUserRepository _users;
    private readonly IDirectoryRepository _directory;
    private readonly IUnitOfWork _unitOfWork;

    public ParentService(
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
