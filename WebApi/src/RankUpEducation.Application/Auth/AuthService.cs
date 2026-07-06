using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Contracts.Auth;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Parents;
using RankUpEducation.Domain.Students;
using RankUpEducation.Domain.Teachers;

namespace RankUpEducation.Application.Auth;

public sealed class AuthService : IAuthService
{
    private static readonly TimeSpan RefreshTokenLifetime = TimeSpan.FromDays(30);
    private static readonly string[] AllowedRegistrationRoles = ["Student", "Parent", "Teacher"];

    private readonly IUserRepository _users;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ICurrentUserService _currentUser;
    private readonly IUnitOfWork _unitOfWork;

    public AuthService(
        IUserRepository users,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        IDateTimeProvider dateTimeProvider,
        ICurrentUserService currentUser,
        IUnitOfWork unitOfWork)
    {
        _users = users;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _dateTimeProvider = dateTimeProvider;
        _currentUser = currentUser;
        _unitOfWork = unitOfWork;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        ValidateLogin(request);

        var user = await _users.GetByUsernameAsync(request.Username.Trim(), cancellationToken)
            ?? throw new AuthenticationAppException("Invalid username or password.");

        try
        {
            user.EnsureCanLogin();
        }
        catch (BusinessRuleException exception)
        {
            throw new AuthenticationAppException(exception.Message);
        }

        if (!_passwordHasher.Verify(request.Password, user.PasswordHash!))
        {
            throw new AuthenticationAppException("Invalid username or password.");
        }

        var refreshToken = IssueRefreshToken(user);
        user.RecordLogin(_dateTimeProvider.UtcNow);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new LoginResponse(
            _tokenService.CreateAccessToken(user),
            refreshToken,
            user.ToCurrentUserResponse());
    }

    public async Task<RegisterAccountResponse> RegisterAccountAsync(
        RegisterAccountRequest request,
        CancellationToken cancellationToken)
    {
        ValidateRegistration(request);

        var username = request.MobileNumber.Trim();
        if (await _users.UsernameExistsAsync(username, cancellationToken))
        {
            throw new ValidationAppException(["An account or request already exists for this mobile number."]);
        }

        var role = ParseRegistrationRole(request.UserType);
        var user = User.CreateRegistrationRequest(
            username,
            request.FullName.Trim(),
            role,
            _dateTimeProvider.UtcNow);

        await _users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new RegisterAccountResponse(user.Id, user.Username, user.FullName, user.Role.ToString());
    }

    public async Task<IReadOnlyList<PendingRegistrationResponse>> ListPendingRegistrationsAsync(
        int take,
        CancellationToken cancellationToken)
    {
        EnsureRegistrationReviewer();

        var safeTake = Math.Clamp(take, 1, 100);
        var users = await _users.ListPendingRegistrationsAsync(safeTake, cancellationToken);
        return users.Select(user => user.ToPendingResponse()).ToArray();
    }

    public async Task<CurrentUserResponse> ApproveRegistrationAsync(
        long userId,
        ApproveRegistrationRequest request,
        CancellationToken cancellationToken)
    {
        EnsureRegistrationReviewer();
        ValidateApprovalPassword(request);

        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundAppException("Registration request was not found.");

        if (!user.IsPendingRegistration)
        {
            throw new BusinessRuleException("This user is not a pending registration request.");
        }

        var mobileNumber = string.IsNullOrWhiteSpace(request.MobileNumber)
            ? user.Username
            : request.MobileNumber.Trim();

        await CreateProfileForRoleAsync(user, request, mobileNumber, cancellationToken);

        user.Activate(_passwordHasher.Hash(request.Password));
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var activated = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundAppException("User account was not found.");

        return activated.ToCurrentUserResponse();
    }

    public async Task RejectRegistrationAsync(long userId, CancellationToken cancellationToken)
    {
        EnsureRegistrationReviewer();

        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundAppException("Registration request was not found.");

        if (!user.IsPendingRegistration)
        {
            throw new BusinessRuleException("This user is not a pending registration request.");
        }

        await _users.DeleteAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<AuthTokensResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        ValidateRefreshToken(request);

        var tokenHash = _tokenService.HashToken(request.RefreshToken.Trim());
        var storedToken = await _users.GetRefreshTokenByHashAsync(tokenHash, cancellationToken)
            ?? throw new AuthenticationAppException("Invalid refresh token.");

        if (!storedToken.IsActive(_dateTimeProvider.UtcNow))
        {
            throw new AuthenticationAppException("Refresh token is expired or revoked.");
        }

        var user = await _users.GetByIdAsync(storedToken.UserId, cancellationToken)
            ?? throw new AuthenticationAppException("User account was not found.");

        user.EnsureCanLogin();
        storedToken.Revoke(_dateTimeProvider.UtcNow);
        var refreshToken = IssueRefreshToken(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new AuthTokensResponse(_tokenService.CreateAccessToken(user), refreshToken);
    }

    public async Task RequestPasswordResetAsync(PasswordResetRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username))
        {
            throw new ValidationAppException(["Username is required."]);
        }

        _ = await _users.GetByUsernameAsync(request.Username.Trim(), cancellationToken);
    }

    public async Task<CurrentUserResponse> GetCurrentUserAsync(CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId ?? throw new AuthenticationAppException("Authentication is required.");
        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundAppException("User account was not found.");

        return user.ToCurrentUserResponse();
    }

    public async Task LogoutAsync(RefreshTokenRequest? request, CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return;
        }

        var tokenHash = _tokenService.HashToken(request.RefreshToken.Trim());
        var storedToken = await _users.GetRefreshTokenByHashAsync(tokenHash, cancellationToken);
        storedToken?.Revoke(_dateTimeProvider.UtcNow);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task CreateProfileForRoleAsync(
        User user,
        ApproveRegistrationRequest request,
        string mobileNumber,
        CancellationToken cancellationToken)
    {
        switch (user.Role)
        {
            case UserRole.Student:
                if (await _users.HasStudentProfileAsync(user.Id, cancellationToken))
                {
                    throw new BusinessRuleException("Student profile already exists.");
                }

                if (request.SchoolId is null || request.CampusId is null || request.Grade is null)
                {
                    throw new ValidationAppException(["School, campus, and grade are required to approve a student."]);
                }

                if (string.IsNullOrWhiteSpace(request.StudentRollNumber))
                {
                    throw new ValidationAppException(["Student roll number is required."]);
                }

                var section = string.IsNullOrWhiteSpace(request.Section) ? "A" : request.Section.Trim();
                await _users.AddStudentProfileAsync(
                    new Student(user.Id, request.SchoolId.Value, request.CampusId.Value, request.StudentRollNumber.Trim(), request.Grade.Value, section, mobileNumber),
                    cancellationToken);
                user.AttachProfileContext(user.Id, request.SchoolId, request.CampusId);
                break;

            case UserRole.Teacher:
                if (await _users.HasTeacherProfileAsync(user.Id, cancellationToken))
                {
                    throw new BusinessRuleException("Teacher profile already exists.");
                }

                if (request.SchoolId is null || request.CampusId is null)
                {
                    throw new ValidationAppException(["School and campus are required to approve a teacher."]);
                }

                if (string.IsNullOrWhiteSpace(request.TeacherCode))
                {
                    throw new ValidationAppException(["Teacher code is required."]);
                }

                await _users.AddTeacherProfileAsync(
                    new Teacher(user.Id, request.SchoolId.Value, request.CampusId.Value, request.TeacherCode.Trim(), mobileNumber),
                    cancellationToken);
                user.AttachProfileContext(user.Id, request.SchoolId, request.CampusId);
                break;

            case UserRole.Parent:
                if (await _users.HasParentProfileAsync(user.Id, cancellationToken))
                {
                    throw new BusinessRuleException("Parent profile already exists.");
                }

                await _users.AddParentProfileAsync(new Parent(user.Id, request.Cnic, mobileNumber), cancellationToken);
                user.AttachProfileContext(user.Id, null, null);
                break;

            default:
                throw new BusinessRuleException("Only student, parent, and teacher registrations can be approved.");
        }
    }

    private void EnsureRegistrationReviewer()
    {
        var role = _currentUser.Role;
        if (!string.Equals(role, UserRole.SuperAdmin.ToString(), StringComparison.OrdinalIgnoreCase)
            && !string.Equals(role, UserRole.SchoolAdmin.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            throw new ForbiddenAppException("Only admins can review registration requests.");
        }
    }

    private static UserRole ParseRegistrationRole(string userType)
    {
        if (!Enum.TryParse<UserRole>(userType.Trim(), true, out var role)
            || !AllowedRegistrationRoles.Contains(role.ToString(), StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationAppException(["User type must be Student, Parent, or Teacher."]);
        }

        return role;
    }

    private string IssueRefreshToken(User user)
    {
        var refreshToken = _tokenService.CreateRefreshToken();
        var tokenHash = _tokenService.HashToken(refreshToken);
        user.AddRefreshToken(new RefreshToken(user.Id, tokenHash, _dateTimeProvider.UtcNow.Add(RefreshTokenLifetime)));
        return refreshToken;
    }

    private static void ValidateLogin(LoginRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.Username))
        {
            errors.Add("Username is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            errors.Add("Password is required.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
    }

    private static void ValidateRegistration(RegisterAccountRequest request)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            errors.Add("Full name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.MobileNumber))
        {
            errors.Add("Mobile number is required.");
        }

        if (string.IsNullOrWhiteSpace(request.UserType))
        {
            errors.Add("User type is required.");
        }

        if (string.IsNullOrWhiteSpace(request.AdminTarget))
        {
            errors.Add("Admin target is required.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
    }

    private static void ValidateApprovalPassword(ApproveRegistrationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
        {
            throw new ValidationAppException(["Password must be at least 6 characters."]);
        }
    }

    private static void ValidateRefreshToken(RefreshTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            throw new ValidationAppException(["Refresh token is required."]);
        }
    }
}
