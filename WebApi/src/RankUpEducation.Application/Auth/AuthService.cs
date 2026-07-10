using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Notifications;
using RankUpEducation.Common.Utilities;
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
    private const string RegistrationRequestCategory = "RegistrationRequest";

    private readonly IUserRepository _users;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ICurrentUserService _currentUser;
    private readonly INotificationService _notifications;
    private readonly IUnitOfWork _unitOfWork;

    public AuthService(
        IUserRepository users,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        IDateTimeProvider dateTimeProvider,
        ICurrentUserService currentUser,
        INotificationService notifications,
        IUnitOfWork unitOfWork)
    {
        _users = users;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _dateTimeProvider = dateTimeProvider;
        _currentUser = currentUser;
        _notifications = notifications;
        _unitOfWork = unitOfWork;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        ValidateLogin(request);

        var user = await _users.GetByLoginIdentifierAsync(request.Username.AsTrimmedString(), cancellationToken)
            ?? throw new AuthenticationAppException("Invalid username or password.");

        try
        {
            user.EnsureCanLogin();
        }
        catch (BusinessRuleException exception)
        {
            throw new AuthenticationAppException(exception.Message);
        }

        if (user.NeedsPasswordSetup)
        {
            throw new AuthenticationAppException(
                "Your account is approved. Set your password on the login screen first, then sign in.");
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            throw new ValidationAppException(["Password is required."]);
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

    public async Task SetInitialPasswordAsync(
        SetInitialPasswordRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username))
        {
            throw new ValidationAppException(["CNIC or mobile number is required."]);
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            throw new ValidationAppException(["New password is required."]);
        }

        if (request.NewPassword.Length < 6)
        {
            throw new ValidationAppException(["New password must be at least 6 characters."]);
        }

        var user = await _users.GetByLoginIdentifierAsync(request.Username.AsTrimmedString(), cancellationToken)
            ?? throw new AuthenticationAppException("Invalid username or password.");

        try
        {
            user.EnsureCanLogin();
        }
        catch (BusinessRuleException exception)
        {
            throw new AuthenticationAppException(exception.Message);
        }

        if (!user.NeedsPasswordSetup)
        {
            throw new ValidationAppException([
                "Password is already set. Sign in with your password."]);
        }

        user.SetPasswordHash(_passwordHasher.Hash(request.NewPassword));
        user.ClearPasswordChangeRequirement();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<RegisterAccountResponse> RegisterAccountAsync(
        RegisterAccountRequest request,
        CancellationToken cancellationToken)
    {
        ValidateRegistration(request);

        var mobileNumber = request.MobileNumber.AsTrimmedString();
        var cnic = request.Cnic.AsTrimmedOrNull();

        // Username priority: CNIC if present, otherwise mobile number.
        var username = cnic ?? mobileNumber;

        if (await _users.UsernameExistsAsync(username, cancellationToken))
        {
            throw new ValidationAppException([
                cnic is null
                    ? "An account or request already exists for this mobile number."
                    : "An account or request already exists for this CNIC."]);
        }

        if (cnic is not null && await _users.CnicExistsAsync(cnic, cancellationToken))
        {
            throw new ValidationAppException(["An account already exists for this CNIC."]);
        }

        if (await _users.MobileNumberExistsAsync(mobileNumber, cancellationToken))
        {
            throw new ValidationAppException(["An account or request already exists for this mobile number."]);
        }

        var role = ParseRegistrationRole(request.UserType);
        var schoolId = request.SchoolId;
        var campusId = schoolId.HasValue ? request.CampusId : null;

        // AdminTarget:
        // - School Admin → School Admin + Portal Admin can approve
        // - Portal Admin → Portal Admin only
        var adminTarget = schoolId.HasValue ? "School Admin" : "Portal Admin";

        var user = User.CreateRegistrationRequest(
            username,
            request.FullName.AsTrimmedString(),
            role,
            _dateTimeProvider.UtcNow,
            mobileNumber,
            request.EmailAddress.AsNormalizedEmailOrNull(),
            cnic,
            schoolId,
            campusId,
            request.ReasonMessage,
            adminTarget,
            request.RollNumberTeacherCode);

        await _users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // In-app notifications for eligible admins already logged into RankUp Education.
        var recipientIds = await _users.ListAdminRecipientsAsync(
            user.AdminTarget,
            user.SchoolId,
            cancellationToken);
        await _notifications.CreateAsync(
            recipientIds,
            "New registration request",
            $"{user.FullName} requested {user.Role} access ({user.Username}).",
            RegistrationRequestCategory,
            cancellationToken);

        return new RegisterAccountResponse(user.Id, user.Username, user.FullName, user.Role.ToString());
    }

    public async Task<IReadOnlyList<PendingRegistrationResponse>> ListPendingRegistrationsAsync(
        int take,
        CancellationToken cancellationToken)
    {
        EnsureRegistrationReviewer();

        var safeTake = Math.Clamp(take, 1, 100);
        int? schoolIdFilter = null;
        if (IsSchoolAdmin())
        {
            schoolIdFilter = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
        }

        var users = await _users.ListPendingRegistrationsAsync(safeTake, schoolIdFilter, cancellationToken);
        return users.Select(user => user.ToPendingResponse()).ToArray();
    }

    public async Task<CurrentUserResponse> ApproveRegistrationAsync(
        long userId,
        CancellationToken cancellationToken)
    {
        EnsureRegistrationReviewer();

        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundAppException("Registration request was not found.");

        if (!user.IsPendingRegistration)
        {
            throw new BusinessRuleException("This user is not a pending registration request.");
        }

        EnsureCanApproveRegistration(user);

        // Username priority: when CNIC is already on the request, username becomes CNIC.
        var resolvedCnic = user.Cnic.AsTrimmedOrNull();
        if (resolvedCnic is not null
            && !string.Equals(user.Username, resolvedCnic, StringComparison.OrdinalIgnoreCase))
        {
            if (await _users.UsernameExistsAsync(resolvedCnic, cancellationToken))
            {
                throw new ValidationAppException(["An account already exists for this CNIC username."]);
            }

            user.SetUsername(resolvedCnic);
        }

        var mobileNumber = user.MobileNumber.HasTrimmedText()
            ? user.MobileNumber!
            : user.Username;

        await CreateProfileForRoleAsync(user, mobileNumber, cancellationToken);

        user.ApprovePendingRegistration();
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

        EnsureCanRejectRegistration(user);

        await _users.DeleteAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<AuthTokensResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        ValidateRefreshToken(request);

        var tokenHash = _tokenService.HashToken(request.RefreshToken.AsTrimmedString());
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

        _ = await _users.GetByLoginIdentifierAsync(request.Username.AsTrimmedString(), cancellationToken);
    }

    public async Task<CurrentUserResponse> GetCurrentUserAsync(CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId ?? throw new AuthenticationAppException("Authentication is required.");
        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundAppException("User account was not found.");

        return user.ToCurrentUserResponse();
    }

    public async Task<CurrentUserResponse> ChangePasswordAsync(
        ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId ?? throw new AuthenticationAppException("Authentication is required.");
        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundAppException("User account was not found.");

        try
        {
            user.EnsureCanLogin();
        }
        catch (BusinessRuleException exception)
        {
            throw new AuthenticationAppException(exception.Message);
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            throw new ValidationAppException(["New password is required."]);
        }

        if (request.NewPassword.Length < 6)
        {
            throw new ValidationAppException(["New password must be at least 6 characters."]);
        }

        if (user.NeedsPasswordSetup)
        {
            user.SetPasswordHash(_passwordHasher.Hash(request.NewPassword));
            user.ClearPasswordChangeRequirement();
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return user.ToCurrentUserResponse();
        }

        user.EnsureHasPassword();

        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
        {
            throw new ValidationAppException(["Current password is required."]);
        }

        if (!_passwordHasher.Verify(request.CurrentPassword, user.PasswordHash!))
        {
            throw new ValidationAppException(["Current password is incorrect."]);
        }

        if (string.Equals(request.CurrentPassword, request.NewPassword, StringComparison.Ordinal))
        {
            throw new ValidationAppException(["New password must be different from the current password."]);
        }

        user.SetPasswordHash(_passwordHasher.Hash(request.NewPassword));
        user.ClearPasswordChangeRequirement();
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return user.ToCurrentUserResponse();
    }

    public async Task LogoutAsync(RefreshTokenRequest? request, CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return;
        }

        var tokenHash = _tokenService.HashToken(request.RefreshToken.AsTrimmedString());
        var storedToken = await _users.GetRefreshTokenByHashAsync(tokenHash, cancellationToken);
        storedToken?.Revoke(_dateTimeProvider.UtcNow);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task CreateProfileForRoleAsync(
        User user,
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

                if (user.SchoolId is null || user.CampusId is null)
                {
                    throw new ValidationAppException(
                        ["School and campus are required on the registration request before approval."]);
                }

                // Grade/section are not collected at request time; use defaults until profile is updated later.
                await _users.AddStudentProfileAsync(
                    new Student(user.Id, grade: 1, section: "A", mobileNumber),
                    cancellationToken);
                user.AttachProfileContext(user.Id, user.SchoolId, user.CampusId);
                break;

            case UserRole.Teacher:
                if (await _users.HasTeacherProfileAsync(user.Id, cancellationToken))
                {
                    throw new BusinessRuleException("Teacher profile already exists.");
                }

                if (user.SchoolId is null || user.CampusId is null)
                {
                    throw new ValidationAppException(
                        ["School and campus are required on the registration request before approval."]);
                }

                await _users.AddTeacherProfileAsync(
                    new Teacher(user.Id, mobileNumber),
                    cancellationToken);
                user.AttachProfileContext(user.Id, user.SchoolId, user.CampusId);
                break;

            case UserRole.Parent:
                if (await _users.HasParentProfileAsync(user.Id, cancellationToken))
                {
                    throw new BusinessRuleException("Parent profile already exists.");
                }

                await _users.AddParentProfileAsync(
                    new Parent(user.Id, mobileNumber),
                    cancellationToken);
                user.AttachProfileContext(user.Id, user.SchoolId, user.CampusId);
                break;

            default:
                throw new BusinessRuleException("Only student, parent, and teacher registrations can be approved.");
        }
    }

    private void EnsureCanApproveRegistration(User user)
    {
        if (!IsSchoolAdmin())
        {
            return;
        }

        // Portal Admin target → SuperAdmin (Portal Admin) only.
        if (IsPortalAdminTarget(user))
        {
            throw new ForbiddenAppException(
                "Portal Admin requests can only be approved by Portal Admin.");
        }

        var adminSchoolId = _currentUser.SchoolId
            ?? throw new ForbiddenAppException("School context was not found.");

        if (!user.SchoolId.HasValue || user.SchoolId != adminSchoolId)
        {
            throw new ForbiddenAppException("You can only approve registrations for your school.");
        }
    }

    private void EnsureCanRejectRegistration(User user)
    {
        if (!IsSchoolAdmin())
        {
            return;
        }

        if (IsPortalAdminTarget(user))
        {
            throw new ForbiddenAppException(
                "Portal Admin requests can only be rejected by Portal Admin.");
        }

        var adminSchoolId = _currentUser.SchoolId
            ?? throw new ForbiddenAppException("School context was not found.");

        if (!user.SchoolId.HasValue || user.SchoolId != adminSchoolId)
        {
            throw new ForbiddenAppException("You can only reject registrations for your school.");
        }
    }

    private static bool IsPortalAdminTarget(User user)
        => string.Equals(user.AdminTarget, "Portal Admin", StringComparison.OrdinalIgnoreCase)
            || !user.SchoolId.HasValue;

    private void EnsureRegistrationReviewer()
    {
        var role = _currentUser.Role;
        if (!string.Equals(role, UserRole.SuperAdmin.ToString(), StringComparison.OrdinalIgnoreCase)
            && !string.Equals(role, UserRole.SchoolAdmin.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            throw new ForbiddenAppException("Only admins can review registration requests.");
        }
    }

    private bool IsSchoolAdmin()
        => string.Equals(_currentUser.Role, UserRole.SchoolAdmin.ToString(), StringComparison.OrdinalIgnoreCase);

    private static UserRole ParseRegistrationRole(string userType)
    {
        if (!Enum.TryParse<UserRole>(userType.AsTrimmedString(), true, out var role)
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
        if (string.IsNullOrWhiteSpace(request.Username))
        {
            throw new ValidationAppException(["CNIC or mobile number is required."]);
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

        if (request.CampusId.HasValue && !request.SchoolId.HasValue)
        {
            errors.Add("Campus requires a school to be selected.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
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
