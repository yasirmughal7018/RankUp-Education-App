using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Contracts.Reports;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Reports;

public sealed class ReportService : IReportService
{
    private readonly IReportRepository _reports;
    private readonly IStudentScopeRepository _studentScope;
    private readonly ICurrentUserService _currentUser;

    public ReportService(
        IReportRepository reports,
        IStudentScopeRepository studentScope,
        ICurrentUserService currentUser)
    {
        _reports = reports;
        _studentScope = studentScope;
        _currentUser = currentUser;
    }

    public async Task<QuizSummaryReportResponse> GetQuizSummaryAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken)
    {
        EnsureAdminOrTeacher();
        var (schoolId, campusId, creatorUserId) = ResolveReportScope();
        return await _reports.GetQuizSummaryAsync(schoolId, campusId, creatorUserId, from, to, cancellationToken);
    }

    public async Task<QuizPerformanceReportResponse> GetQuizPerformanceAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        EnsureAdminOrTeacher();
        var (schoolId, campusId, creatorUserId) = ResolveReportScope();
        return await _reports.GetQuizPerformanceAsync(
            quizId,
            schoolId,
            campusId,
            creatorUserId,
            cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");
    }

    public async Task<StudentQuizHistoryResponse> GetStudentQuizHistoryAsync(
        long studentId,
        CancellationToken cancellationToken)
    {
        await EnsureCanViewStudentAsync(studentId, cancellationToken);
        return await _reports.GetStudentQuizHistoryAsync(studentId, cancellationToken);
    }

    public async Task<RankingReportResponse> GetRankingsAsync(
        long? quizId,
        CancellationToken cancellationToken)
    {
        EnsureAdminOrTeacher();
        var (schoolId, campusId, creatorUserId) = ResolveReportScope();
        return await _reports.GetRankingsAsync(quizId, schoolId, campusId, creatorUserId, cancellationToken);
    }

    private async Task EnsureCanViewStudentAsync(long studentId, CancellationToken cancellationToken)
    {
        var role = ParseRole();
        if (role == UserRole.Student)
        {
            var selfId = _currentUser.ProfileId ?? _currentUser.UserId
                ?? throw new ForbiddenAppException("Student profile was not found.");
            if (selfId != studentId)
            {
                throw new ForbiddenAppException("You can only view your own quiz history.");
            }

            return;
        }

        if (role == UserRole.Parent)
        {
            var parentId = _currentUser.ProfileId ?? _currentUser.UserId
                ?? throw new ForbiddenAppException("Parent profile was not found.");
            if (!await _studentScope.IsLinkedStudentAsync(parentId, studentId, cancellationToken))
            {
                throw new ForbiddenAppException("You can only view linked student history.");
            }

            return;
        }

        if (role is UserRole.Teacher or UserRole.SchoolAdmin)
        {
            var schoolId = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
            var campusId = _currentUser.CampusId
                ?? throw new ForbiddenAppException("Campus context was not found.");
            if (!await _studentScope.IsStudentInSchoolAsync(studentId, schoolId, campusId, cancellationToken))
            {
                throw new ForbiddenAppException("Student is outside your school campus.");
            }

            return;
        }

        if (role != UserRole.PortalAdmin)
        {
            throw new ForbiddenAppException("You do not have access to student quiz history.");
        }
    }

    private void EnsureAdminOrTeacher()
    {
        var role = ParseRole();
        if (role is not (UserRole.PortalAdmin or UserRole.SchoolAdmin or UserRole.Teacher))
        {
            throw new ForbiddenAppException("You do not have access to reports.");
        }
    }

    private (int? SchoolId, int? CampusId, long? CreatorUserId) ResolveReportScope()
    {
        var role = ParseRole();
        if (role == UserRole.Teacher)
        {
            return (_currentUser.SchoolId, _currentUser.CampusId, _currentUser.UserId);
        }

        if (role == UserRole.SchoolAdmin)
        {
            return (_currentUser.SchoolId, _currentUser.CampusId, null);
        }

        return (null, null, null);
    }

    private UserRole ParseRole()
    {
        if (string.IsNullOrWhiteSpace(_currentUser.Role))
        {
            throw new AuthenticationAppException("Authentication is required.");
        }

        return Enum.Parse<UserRole>(_currentUser.Role, ignoreCase: true);
    }
}
