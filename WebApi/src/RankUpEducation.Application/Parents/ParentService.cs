using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Contracts.Parents;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Parents;

public sealed class ParentService : IParentService
{
    private readonly ICurrentUserService _currentUser;
    private readonly IStudentScopeRepository _studentScope;

    public ParentService(ICurrentUserService currentUser, IStudentScopeRepository studentScope)
    {
        _currentUser = currentUser;
        _studentScope = studentScope;
    }

    public async Task<LinkedStudentListResponse> ListLinkedStudentsAsync(CancellationToken cancellationToken)
    {
        if (!string.Equals(_currentUser.Role, nameof(UserRole.Parent), StringComparison.OrdinalIgnoreCase))
        {
            throw new ForbiddenAppException("Only parents can list linked students.");
        }

        var parentId = _currentUser.ProfileId
            ?? _currentUser.UserId
            ?? throw new ForbiddenAppException("Parent profile was not found.");

        var students = await _studentScope.GetLinkedStudentsAsync(parentId, cancellationToken);

        return new LinkedStudentListResponse(
            students.Select(student => new LinkedStudentResponse(
                student.StudentId,
                student.FullName,
                student.RollNumber,
                student.Grade,
                student.Section,
                student.Relationship)).ToArray());
    }
}
