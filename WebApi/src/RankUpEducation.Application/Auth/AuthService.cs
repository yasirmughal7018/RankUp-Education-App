using Microsoft.Extensions.Configuration;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Directory;
using RankUpEducation.Application.Lookups;
using RankUpEducation.Application.Notifications;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Contracts.Auth;
using RankUpEducation.Domain.Approvals;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Parents;
using RankUpEducation.Domain.Students;
using RankUpEducation.Domain.Teachers;

namespace RankUpEducation.Application.Auth;

/// <summary>
/// Authentication and account lifecycle: login, registration approval, role switching,
/// school-change requests, password management, profile/avatar updates.
/// </summary>
public sealed class AuthService : IAuthService
{
    private static readonly TimeSpan RefreshTokenLifetime = TimeSpan.FromDays(30);
    private static readonly string[] AllowedRegistrationRoles = ["Student", "Parent", "Teacher"];
    private const string RegistrationRequestCategory = "RegistrationRequest";
    private const string SchoolChangeRequestCategory = "SchoolChangeRequest";
    private const string RoleRequestCategory = "RoleRequest";
    private const string PasswordResetRequestCategory = "PasswordResetRequest";
    private const string LockedPendingSchoolChangeMessage =
        "Your account is locked because you requested a school or campus change. An admin for the destination school or campus must approve (or reject) the change before you can sign in again.";
    private const string LockedRolePendingSchoolChangeMessageFormat =
        "Your {0} role is locked because you requested a school or campus change. You can keep using your other role(s) until an admin approves or rejects the change.";

    private static readonly TimeSpan PasswordResetTokenLifetime = TimeSpan.FromHours(2);
    private readonly IUserRepository _users;
    private readonly ISchoolChangeRequestRepository _schoolChanges;
    private readonly IUserRoleRequestRepository _roleRequests;
    private readonly IPasswordResetRequestRepository _passwordResets;
    private readonly IDirectoryRepository _directory;
    private readonly IStudentScopeRepository _studentScope;
    private readonly ILookupRepository _lookups;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ICurrentUserService _currentUser;
    private readonly INotificationService _notifications;
    private readonly IFileStorageService _fileStorage;
    private readonly IEmailService _email;
    private readonly IConfiguration _configuration;
    private readonly IUnitOfWork _unitOfWork;

    public AuthService(
        IUserRepository users,
        ISchoolChangeRequestRepository schoolChanges,
        IUserRoleRequestRepository roleRequests,
        IPasswordResetRequestRepository passwordResets,
        IDirectoryRepository directory,
        IStudentScopeRepository studentScope,
        ILookupRepository lookups,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        IDateTimeProvider dateTimeProvider,
        ICurrentUserService currentUser,
        INotificationService notifications,
        IFileStorageService fileStorage,
        IEmailService email,
        IConfiguration configuration,
        IUnitOfWork unitOfWork)
    {
        _users = users;
        _schoolChanges = schoolChanges;
        _roleRequests = roleRequests;
        _passwordResets = passwordResets;
        _directory = directory;
        _studentScope = studentScope;
        _lookups = lookups;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _dateTimeProvider = dateTimeProvider;
        _currentUser = currentUser;
        _notifications = notifications;
        _fileStorage = fileStorage;
        _email = email;
        _configuration = configuration;
        _unitOfWork = unitOfWork;
    }

    /// <inheritdoc />
    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        ValidateLogin(request);

        var user = await _users.GetByLoginIdentifierAsync(request.Username.AsTrimmedString(), cancellationToken)
            ?? throw new AuthenticationAppException("Invalid username or password.");

        try
        {
            await TryConvertFullSchoolChangeLockToRoleScopedAsync(user, cancellationToken);
            user.EnsureCanLogin();
        }
        catch (BusinessRuleException exception)
        {
            var pendingLockMessage = await TryGetPendingSchoolChangeLockMessageAsync(
                user,
                cancellationToken);
            throw new AuthenticationAppException(pendingLockMessage ?? exception.Message);
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

        var lockedRole = await GetPendingSchoolChangeLockedRoleAsync(user.Id, cancellationToken);
        var activeRole = ResolveUsableSessionRole(user, preferredRole: null, lockedRole);
        var refreshToken = IssueRefreshToken(user, activeRole);
        var loginAt = _dateTimeProvider.UtcNow;
        user.RecordLogin(loginAt);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        // Persist last_login_at explicitly so login time is saved even if the
        // tracked entity change for that column is missed.
        await _users.UpdateLastLoginAtAsync(user.Id, loginAt, cancellationToken);

        var sessionUser = await _users.GetByIdForRoleAsync(user.Id, activeRole, cancellationToken) ?? user;

        return new LoginResponse(
            _tokenService.CreateAccessToken(sessionUser, activeRole),
            refreshToken,
            await ToCurrentUserResponseAsync(sessionUser, activeRole, cancellationToken));
    }

    /// <inheritdoc />
    public async Task<LoginResponse> SwitchRoleAsync(
        SwitchRoleRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId ?? throw new AuthenticationAppException("Authentication is required.");
        if (string.IsNullOrWhiteSpace(request.Role)
            || !Enum.TryParse<UserRole>(request.Role.AsTrimmedString(), true, out var targetRole))
        {
            throw new ValidationAppException(["Role is required."]);
        }

        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundAppException("User account was not found.");

        try
        {
            await TryConvertFullSchoolChangeLockToRoleScopedAsync(user, cancellationToken);
            user.EnsureCanLogin();
            user.EnsureHasRole(targetRole);
        }
        catch (BusinessRuleException exception)
        {
            throw new AuthenticationAppException(exception.Message);
        }

        var lockedRole = await GetPendingSchoolChangeLockedRoleAsync(user.Id, cancellationToken);
        if (lockedRole == targetRole)
        {
            throw new ValidationAppException([
                string.Format(LockedRolePendingSchoolChangeMessageFormat, targetRole),
            ]);
        }

        var sessionUser = await _users.GetByIdForRoleAsync(user.Id, targetRole, cancellationToken) ?? user;
        var refreshToken = IssueRefreshToken(sessionUser, targetRole);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new LoginResponse(
            _tokenService.CreateAccessToken(sessionUser, targetRole),
            refreshToken,
            await ToCurrentUserResponseAsync(sessionUser, targetRole, cancellationToken));
    }

    /// <inheritdoc />
    public async Task<LoginResponse> RemoveMyRoleAsync(
        string role,
        CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId ?? throw new AuthenticationAppException("Authentication is required.");
        if (string.IsNullOrWhiteSpace(role)
            || !Enum.TryParse<UserRole>(role.AsTrimmedString(), true, out var roleToRemove))
        {
            throw new ValidationAppException(["Role is required."]);
        }

        var currentRole = ResolveActiveRoleFromClaims();
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

        if (await _users.HasStudentGroupsForRoleAsync(user.Id, roleToRemove, cancellationToken))
        {
            throw new ValidationAppException([
                $"Cannot remove {roleToRemove}: student groups still reference this role. Delete or reassign those groups first.",
            ]);
        }

        try
        {
            user.RemoveRole(roleToRemove);
        }
        catch (BusinessRuleException exception)
        {
            throw new ValidationAppException([exception.Message]);
        }

        var nextRole = user.HasRole(currentRole)
            ? currentRole
            : user.Roles[0];

        var sessionUser = await _users.GetByIdForRoleAsync(user.Id, nextRole, cancellationToken) ?? user;
        var refreshToken = IssueRefreshToken(sessionUser, nextRole);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new LoginResponse(
            _tokenService.CreateAccessToken(sessionUser, nextRole),
            refreshToken,
            sessionUser.ToCurrentUserResponse(nextRole));
    }

    /// <inheritdoc />
    public async Task<LoginStatusResponse> GetLoginStatusAsync(
        LoginStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username))
        {
            throw new ValidationAppException(["CNIC or mobile number is required."]);
        }

        var user = await _users.GetByLoginIdentifierAsync(request.Username.AsTrimmedString(), cancellationToken)
            ?? throw new AuthenticationAppException(
                "No account found for this CNIC or mobile number.");

        if (user.IsDeleted)
        {
            throw new AuthenticationAppException("This account is not active.");
        }

        if (user.IsRejectedRegistration)
        {
            var storedReason = user.RejectionReason?.Trim();
            var rejectMessage = !string.IsNullOrWhiteSpace(storedReason)
                ? $"Your registration request was rejected: {storedReason}"
                : "Your registration request was rejected. You may submit a new request.";
            return new LoginStatusResponse(
                "Rejected",
                rejectMessage);
        }

        if (user.IsPendingRegistration)
        {
            return new LoginStatusResponse(
                "PendingApproval",
                "Your login is not approved yet. Please wait for admin approval.");
        }

        if (!user.IsActive)
        {
            var converted = await TryConvertFullSchoolChangeLockToRoleScopedAsync(
                user,
                cancellationToken);
            if (!converted)
            {
                var pendingLockMessage = await TryGetPendingSchoolChangeLockMessageAsync(
                    user,
                    cancellationToken);
                if (pendingLockMessage is not null)
                {
                    return new LoginStatusResponse(
                        "LockedPendingSchoolChange",
                        pendingLockMessage);
                }

                throw new AuthenticationAppException("This account is not active.");
            }
        }

        if (user.NeedsPasswordSetup)
        {
            return new LoginStatusResponse(
                "NeedsPasswordSetup",
                "Your account is approved. Set your password to continue, then sign in.");
        }

        return new LoginStatusResponse(
            "Ready",
            "Enter your password to sign in.");
    }

    /// <inheritdoc />
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

    /// <inheritdoc />
    public async Task<RegisterAccountResponse> RegisterAccountAsync(
        RegisterAccountRequest request,
        CancellationToken cancellationToken)
    {
        ValidateRegistration(request);

        var mobileNumber = request.MobileNumber.AsTrimmedOrNull();
        var cnic = request.Cnic.AsTrimmedOrNull();
        var role = ParseRegistrationRole(request.UserType);
        var emailAddress = request.EmailAddress.AsNormalizedEmailOrNull()
            ?? throw new ValidationAppException([
                "Email address is required (it is the username)."]);

        // Username is always the email for Student / Parent / Teacher.
        var username = emailAddress;

        if (await _users.UsernameExistsAsync(username, cancellationToken))
        {
            throw new ValidationAppException([
                "An account or request already exists for this email address."]);
        }

        if (cnic is not null && await _users.CnicExistsAsync(cnic, cancellationToken))
        {
            throw new ValidationAppException(["An account already exists for this CNIC."]);
        }

        if (mobileNumber is not null
            && await _users.MobileNumberExistsAsync(mobileNumber, cancellationToken))
        {
            throw new ValidationAppException(["An account or request already exists for this mobile number."]);
        }

        // Parent: never school/campus.
        // Student/Teacher: school and campus are optional; they drive the approval queue.
        var schoolId = role == UserRole.Parent ? null : request.SchoolId;
        var campusId = role == UserRole.Parent || !schoolId.HasValue
            ? null
            : request.CampusId;
        // Reject unknown / inactive destinations before queuing reviewers.
        await EnsureActiveSchoolCampusDestinationAsync(schoolId, campusId, cancellationToken);
        // Student roll number only when a school is selected; Parent never uses it.
        var rollNumberTeacherCode = role == UserRole.Parent
            || (role == UserRole.Student && !schoolId.HasValue)
            ? null
            : request.RollNumberTeacherCode;

        short? registrationGrade = null;
        string? registrationSection = null;
        if (role == UserRole.Student)
        {
            registrationGrade = request.Grade;
            registrationSection = request.Section.AsTrimmedOrNull();
            var gradeLookup = await _lookups.GetByIdAndTypeAsync(
                registrationGrade!.Value,
                LookupNames.Class,
                cancellationToken);
            if (gradeLookup is null)
            {
                throw new ValidationAppException(["Grade must be a valid Class option."]);
            }
        }

        var user = User.CreateRegistrationRequest(
            username,
            request.FullName.AsTrimmedString(),
            role,
            _dateTimeProvider.UtcNow,
            mobileNumber,
            emailAddress,
            cnic,
            schoolId,
            campusId,
            request.ReasonMessage,
            rollNumberTeacherCode,
            registrationGrade,
            registrationSection);

        await _users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Approval queue lives only in app_approval:
        // no school → PortalAdmin;
        // school only → SchoolAdmin + PortalAdmin;
        // campus → CampusAdmin + SchoolAdmin + PortalAdmin.
        // Activation: destination Campus/School Admin can activate in scope;
        // PortalAdmin can activate any (required when there is no school).
        var approverCandidates = await _users.ListPendingApproverCandidatesAsync(
            user.SchoolId,
            user.CampusId,
            cancellationToken);
        if (approverCandidates.Count > 0)
        {
            var approvalRows = approverCandidates
                .Select(candidate => Approval.CreatePending(
                    user.Id,
                    candidate.UserId,
                    candidate.Role))
                .ToArray();
            await _users.AddApprovalsAsync(approvalRows, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        var recipientIds = approverCandidates
            .Select(candidate => candidate.UserId)
            .Distinct()
            .ToArray();
        await _notifications.CreateAsync(
            recipientIds,
            "New registration request",
            $"{user.FullName} requested {user.Role} access ({user.Username}).",
            RegistrationRequestCategory,
            cancellationToken);

        return new RegisterAccountResponse(user.Id, user.Username, user.FullName, user.Role.ToString());
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<PendingRegistrationResponse>> ListPendingRegistrationsAsync(
        int take,
        CancellationToken cancellationToken)
    {
        EnsureRegistrationReviewer();

        var safeTake = Math.Clamp(take, 1, 100);
        int? schoolIdFilter = null;
        int? campusIdFilter = null;
        if (IsCampusAdmin())
        {
            schoolIdFilter = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
            campusIdFilter = _currentUser.CampusId
                ?? throw new ForbiddenAppException("Campus context was not found.");
        }
        else if (IsSchoolAdmin())
        {
            schoolIdFilter = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
        }

        var users = await _users.ListPendingRegistrationsAsync(
            safeTake,
            schoolIdFilter,
            campusIdFilter,
            cancellationToken);

        var viewerId = _currentUser.UserId
            ?? throw new AuthenticationAppException("Authentication is required.");
        if (!Enum.TryParse<UserRole>(_currentUser.Role, true, out var viewerRole))
        {
            throw new ForbiddenAppException("Approver role was not found.");
        }

        var responses = new List<PendingRegistrationResponse>(users.Count);
        foreach (var pendingUser in users)
        {
            var pendingApprovers = await _users.ListPendingApproversForUserAsync(
                pendingUser.Id,
                cancellationToken);
            // Fallback for legacy requests created before the approval queue existed.
            if (pendingApprovers.Count == 0)
            {
                pendingApprovers = await _users.ListPendingApproverCandidatesAsync(
                    pendingUser.SchoolId,
                    pendingUser.CampusId,
                    cancellationToken);
            }

            var approvers = pendingApprovers
                .Select(candidate => new PendingApproverResponse(
                    candidate.UserId,
                    candidate.FullName,
                    candidate.Username,
                    candidate.Role.ToString()))
                .ToArray();

            var currentUserHasApproved = await _users.HasApprovedAsync(
                pendingUser.Id,
                viewerId,
                viewerRole,
                cancellationToken);

            string? gradeName = null;
            if (pendingUser.RegistrationGrade is > 0)
            {
                gradeName = await _lookups.GetLookupNameAsync(
                    pendingUser.RegistrationGrade.Value,
                    cancellationToken);
                if (string.Equals(gradeName, "Unknown", StringComparison.OrdinalIgnoreCase))
                {
                    gradeName = null;
                }
            }

            responses.Add(pendingUser.ToPendingResponse(approvers, currentUserHasApproved, gradeName));
        }

        return responses;
    }

    /// <inheritdoc />
    public async Task<ApproveRegistrationResponse> ApproveRegistrationAsync(
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

        var approverId = _currentUser.UserId
            ?? throw new AuthenticationAppException("Authentication is required.");
        if (!Enum.TryParse<UserRole>(_currentUser.Role, true, out var approverRole))
        {
            throw new ForbiddenAppException("Approver role was not found.");
        }

        // Record this admin's approval in app_approval.
        var pendingApproval = await _users.GetPendingApprovalAsync(
            user.Id,
            approverId,
            approverRole,
            cancellationToken);
        if (pendingApproval is not null)
        {
            pendingApproval.MarkApproved(_dateTimeProvider.UtcNow);
        }
        else if (await _users.HasApprovedAsync(user.Id, approverId, approverRole, cancellationToken))
        {
            throw new BusinessRuleException(
                "You already approved this request. It stays pending until an authorized admin activates it.");
        }
        else
        {
            // Legacy request without a queue row for this approver.
            var approval = Approval.CreatePending(user.Id, approverId, approverRole);
            approval.MarkApproved(_dateTimeProvider.UtcNow);
            await _users.AddApprovalAsync(approval, cancellationToken);
        }

        // Activation rules:
        // - PortalAdmin → activate any request (including no-school / Parent).
        // - SchoolAdmin → activate Student/Teacher for their school.
        // - CampusAdmin → activate Student/Teacher for their campus.
        // - No school on the request → PortalAdmin only (enforced by EnsureCanApproveRegistration).
        if (!CanActivateRegistration(user, approverRole))
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return new ApproveRegistrationResponse(
                user.Id,
                user.Username,
                user.FullName,
                IsActivated: false,
                Message:
                    "Your approval was recorded. The account stays pending until an authorized admin activates it.");
        }

        // Username stays as registered (email).
        await CreateProfileForRoleAsync(user, user.MobileNumber, cancellationToken);
        user.ApprovePendingRegistration();
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new ApproveRegistrationResponse(
            user.Id,
            user.Username,
            user.FullName,
            IsActivated: true,
            Message:
                "Registration approved. The user can set their initial password and sign in.");
    }

    /// <inheritdoc />
    public async Task RejectRegistrationAsync(
        long userId,
        string reason,
        CancellationToken cancellationToken)
    {
        EnsureRegistrationReviewer();

        var trimmedReason = reason.AsTrimmedString();
        if (trimmedReason.Length < 10)
        {
            throw new ValidationAppException([
                "Rejection reason is required (at least 10 characters)."
            ]);
        }

        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundAppException("Registration request was not found.");

        if (!user.IsPendingRegistration)
        {
            throw new BusinessRuleException("This user is not a pending registration request.");
        }

        EnsureCanRejectRegistration(user);

        var rejectorId = _currentUser.UserId
            ?? throw new AuthenticationAppException("Authentication is required.");
        if (!Enum.TryParse<UserRole>(_currentUser.Role, true, out var rejectorRole))
        {
            throw new ForbiddenAppException("Approver role was not found.");
        }

        var rejectedAt = _dateTimeProvider.UtcNow;

        // Record rejection on this admin's queue row (keep trail; do not delete user).
        var approval = await _users.GetApprovalAsync(
            user.Id,
            rejectorId,
            rejectorRole,
            cancellationToken);
        if (approval is not null)
        {
            approval.RecordRejected(rejectedAt, trimmedReason);
        }
        else
        {
            var rejection = Approval.CreatePending(user.Id, rejectorId, rejectorRole);
            rejection.MarkRejected(rejectedAt, trimmedReason);
            await _users.AddApprovalAsync(rejection, cancellationToken);
        }

        user.RejectPendingRegistration(rejectedAt, trimmedReason);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <inheritdoc />
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

        await TryConvertFullSchoolChangeLockToRoleScopedAsync(user, cancellationToken);
        user.EnsureCanLogin();
        var lockedRole = await GetPendingSchoolChangeLockedRoleAsync(user.Id, cancellationToken);
        var preferredRole = storedToken.ActiveRole;
        if (preferredRole.HasValue && preferredRole == lockedRole)
        {
            preferredRole = null;
        }

        var activeRole = ResolveUsableSessionRole(user, preferredRole, lockedRole);

        storedToken.Revoke(_dateTimeProvider.UtcNow);
        var sessionUser = await _users.GetByIdForRoleAsync(user.Id, activeRole, cancellationToken) ?? user;
        var refreshToken = IssueRefreshToken(sessionUser, activeRole);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new AuthTokensResponse(_tokenService.CreateAccessToken(sessionUser, activeRole), refreshToken);
    }

    /// <inheritdoc />
    public async Task RequestPasswordResetAsync(PasswordResetRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username))
        {
            throw new ValidationAppException(["Username is required."]);
        }

        // Never reveal whether the identifier exists — always return success to the client.
        var user = await _users.GetByLoginIdentifierAsync(
            request.Username.AsTrimmedString(),
            cancellationToken);
        if (user is null
            || user.IsDeleted
            || !user.IsActive
            || user.IsPendingRegistration
            || user.IsRejectedRegistration
            || !user.PasswordHash.HasTrimmedText())
        {
            return;
        }

        var now = _dateTimeProvider.UtcNow;
        await _passwordResets.CancelPendingForUserAsync(user.Id, now, cancellationToken);

        string? plainToken = null;
        string? tokenHash = null;
        DateTimeOffset? tokenExpires = null;
        var email = user.EmailAddress.AsNormalizedEmailOrNull()
            ?? (user.Username.Contains('@', StringComparison.Ordinal)
                ? user.Username.AsNormalizedEmailOrNull()
                : null);

        if (email is not null)
        {
            plainToken = TokenHasher.GenerateUrlSafeToken();
            tokenHash = TokenHasher.HashTokenSha256Hex(plainToken);
            tokenExpires = now.Add(PasswordResetTokenLifetime);
        }

        var resetRequest = UserPasswordResetRequest.Create(
            user.Id,
            user.Role,
            tokenHash,
            tokenExpires,
            now);
        await _passwordResets.AddAsync(resetRequest, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (email is not null && plainToken is not null)
        {
            var resetUrl = BuildPasswordResetUrl(plainToken);
            await _email.SendAsync(
                email,
                "Reset your RankUp Education password",
                $"Hello {user.FullName},\n\n"
                + "We received a request to reset your password.\n"
                + $"Open this link to choose a new password (expires in {(int)PasswordResetTokenLifetime.TotalHours} hours):\n"
                + $"{resetUrl}\n\n"
                + "If you did not request this, you can ignore this email.\n"
                + "School Admin / Campus Admin / Parent / Portal Admin may also complete this request; "
                + "only the first completion is applied.\n",
                cancellationToken);
        }

        var recipientIds = await ResolvePasswordResetRecipientIdsAsync(user, cancellationToken);
        if (recipientIds.Count > 0)
        {
            await _notifications.CreateAsync(
                recipientIds,
                $"Password reset: {user.Username}",
                $"{user.FullName} ({user.Role}) requested a password reset (#{resetRequest.Id}). "
                + "Clear their password so they can set a new one on the login screen. "
                + "Once one person completes the reset, others cannot.",
                PasswordResetRequestCategory,
                cancellationToken);
        }
    }

    /// <inheritdoc />
    public async Task CompletePasswordResetAsync(
        CompletePasswordResetRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
        {
            throw new ValidationAppException(["Reset token is required."]);
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            throw new ValidationAppException(["New password is required."]);
        }

        if (request.NewPassword.Length < 6)
        {
            throw new ValidationAppException(["New password must be at least 6 characters."]);
        }

        var tokenHash = TokenHasher.HashTokenSha256Hex(request.Token.AsTrimmedString());
        var resetRequest = await _passwordResets.GetPendingByEmailTokenHashAsync(
            tokenHash,
            cancellationToken)
            ?? throw new ValidationAppException([
                "This password reset link is invalid or was already used."]);

        var now = _dateTimeProvider.UtcNow;
        if (!resetRequest.MatchesEmailToken(tokenHash, now))
        {
            throw new ValidationAppException([
                "This password reset link is invalid or has expired."]);
        }

        var user = await _users.GetByIdAsync(resetRequest.UserId, cancellationToken)
            ?? throw new NotFoundAppException("User account was not found.");

        if (user.IsDeleted || !user.IsActive || user.IsPendingRegistration || user.IsRejectedRegistration)
        {
            throw new BusinessRuleException("This account cannot reset its password right now.");
        }

        try
        {
            resetRequest.Complete(now, completedByUserId: null, completedByRole: null);
        }
        catch (BusinessRuleException exception)
        {
            throw new ValidationAppException([exception.Message]);
        }

        user.SetPasswordHash(_passwordHasher.Hash(request.NewPassword));
        user.ClearPasswordChangeRequirement();
        await _users.RevokeRefreshTokensForUserAsync(user.Id, now, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task ClearPasswordForResetAsync(
        PasswordResetRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username))
        {
            throw new ValidationAppException(["Username is required."]);
        }

        var user = await _users.GetByLoginIdentifierAsync(
            request.Username.AsTrimmedString(),
            cancellationToken)
            ?? throw new NotFoundAppException("User account was not found.");

        await EnsureCanClearPasswordForResetAsync(user, cancellationToken);

        var resetRequest = await _passwordResets.GetPendingForUserAsync(user.Id, cancellationToken)
            ?? throw new BusinessRuleException(
                "No pending password reset request was found. It may already have been completed.");

        if (!Enum.TryParse<UserRole>(_currentUser.Role, true, out var clearerRole))
        {
            throw new ForbiddenAppException("You are not allowed to clear passwords for reset.");
        }

        var clearerId = _currentUser.UserId
            ?? throw new AuthenticationAppException("Authentication is required.");

        var now = _dateTimeProvider.UtcNow;
        try
        {
            resetRequest.Complete(now, clearerId, clearerRole);
            user.ClearPasswordForAdminReset();
        }
        catch (BusinessRuleException exception)
        {
            throw new ValidationAppException([exception.Message]);
        }

        await _users.RevokeRefreshTokensForUserAsync(user.Id, now, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Recipients who may complete a pending reset for the requester's role:
    /// Student → SchoolAdmin, CampusAdmin, Parent, PortalAdmin;
    /// Teacher → SchoolAdmin, CampusAdmin, PortalAdmin;
    /// CampusAdmin → SchoolAdmin, PortalAdmin;
    /// SchoolAdmin → PortalAdmin.
    /// </summary>
    private async Task<IReadOnlyList<long>> ResolvePasswordResetRecipientIdsAsync(
        User user,
        CancellationToken cancellationToken)
    {
        var ids = new HashSet<long>();
        var role = user.Role;

        if (role == UserRole.Student)
        {
            var candidates = await _users.ListPendingApproverCandidatesAsync(
                user.SchoolId,
                user.CampusId,
                cancellationToken);
            foreach (var candidate in candidates)
            {
                ids.Add(candidate.UserId);
            }

            foreach (var parentId in await _studentScope.GetLinkedParentIdsAsync(user.Id, cancellationToken))
            {
                ids.Add(parentId);
            }
        }
        else if (role == UserRole.Teacher)
        {
            var candidates = await _users.ListPendingApproverCandidatesAsync(
                user.SchoolId,
                user.CampusId,
                cancellationToken);
            foreach (var candidate in candidates)
            {
                if (candidate.Role is UserRole.PortalAdmin or UserRole.SchoolAdmin or UserRole.CampusAdmin)
                {
                    ids.Add(candidate.UserId);
                }
            }
        }
        else if (role == UserRole.CampusAdmin)
        {
            var candidates = await _users.ListPendingApproverCandidatesAsync(
                user.SchoolId,
                campusId: null,
                cancellationToken);
            foreach (var candidate in candidates)
            {
                if (candidate.Role is UserRole.PortalAdmin or UserRole.SchoolAdmin)
                {
                    ids.Add(candidate.UserId);
                }
            }
        }
        else if (role == UserRole.SchoolAdmin)
        {
            var candidates = await _users.ListPendingApproverCandidatesAsync(
                schoolId: null,
                campusId: null,
                cancellationToken);
            foreach (var candidate in candidates)
            {
                if (candidate.Role == UserRole.PortalAdmin)
                {
                    ids.Add(candidate.UserId);
                }
            }
        }
        else if (role == UserRole.Parent)
        {
            var candidates = await _users.ListPendingApproverCandidatesAsync(
                schoolId: null,
                campusId: null,
                cancellationToken);
            foreach (var candidate in candidates)
            {
                if (candidate.Role == UserRole.PortalAdmin)
                {
                    ids.Add(candidate.UserId);
                }
            }
        }

        ids.Remove(user.Id);
        return ids.ToArray();
    }

    private string BuildPasswordResetUrl(string plainToken)
    {
        var baseUrl = _configuration["App:PublicWebBaseUrl"].AsTrimmedOrNull()
            ?? _configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()?.FirstOrDefault()
            ?? "http://localhost:5173";
        return $"{baseUrl.TrimEnd('/')}/reset-password?token={Uri.EscapeDataString(plainToken)}";
    }

    /// <inheritdoc />
    public async Task<CurrentUserResponse> GetCurrentUserAsync(CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId ?? throw new AuthenticationAppException("Authentication is required.");
        var activeRole = ResolveActiveRoleFromClaims();
        var user = await _users.GetByIdForRoleAsync(userId, activeRole, cancellationToken)
            ?? throw new NotFoundAppException("User account was not found.");

        return await ToCurrentUserResponseAsync(user, activeRole, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<CurrentUserResponse> UpdateProfileAsync(
        UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId ?? throw new AuthenticationAppException("Authentication is required.");
        var activeRole = ResolveActiveRoleFromClaims();
        var user = await _users.GetByIdForRoleAsync(userId, activeRole, cancellationToken)
            ?? throw new NotFoundAppException("User account was not found.");

        try
        {
            user.EnsureCanLogin();
        }
        catch (BusinessRuleException exception)
        {
            throw new AuthenticationAppException(exception.Message);
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new ValidationAppException(["Display name is required."]);
        }

        var mobileNumber = request.MobileNumber.AsTrimmedOrNull();
        var cnic = request.Cnic.AsTrimmedOrNull();
        var emailAddress = request.EmailAddress.AsNormalizedEmailOrNull();
        if (emailAddress is null)
        {
            throw new ValidationAppException(["Email address is required (it is the username)."]);
        }

        if (mobileNumber is not null)
        {
            var existingMobile = await _users.GetByMobileNumberAsync(mobileNumber, cancellationToken);
            if (existingMobile is not null && existingMobile.Id != user.Id)
            {
                throw new ValidationAppException(["An account already exists for this mobile number."]);
            }
        }

        if (cnic is not null)
        {
            var existingCnic = await _users.GetByCnicAsync(cnic, cancellationToken);
            if (existingCnic is not null && existingCnic.Id != user.Id)
            {
                throw new ValidationAppException(["An account already exists for this CNIC."]);
            }
        }

        // Username follows email for Student / Teacher / Parent / SchoolAdmin / CampusAdmin.
        if (!string.Equals(user.Username, emailAddress, StringComparison.OrdinalIgnoreCase))
        {
            if (await _users.UsernameExistsAsync(emailAddress, cancellationToken))
            {
                throw new ValidationAppException(["An account already exists for this email address."]);
            }

            user.SetUsername(emailAddress);
        }

        try
        {
            user.UpdateSelfServiceContact(
                request.FullName.AsTrimmedString(),
                mobileNumber,
                emailAddress,
                cnic);
        }
        catch (BusinessRuleException exception)
        {
            throw new ValidationAppException([exception.Message]);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await ToCurrentUserResponseAsync(user, activeRole, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<RequestSchoolChangeResponse> RequestSchoolChangeAsync(
        RequestSchoolChangeRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId ?? throw new AuthenticationAppException("Authentication is required.");
        var activeRole = ResolveActiveRoleFromClaims();
        var user = await _users.GetByIdForRoleAsync(userId, activeRole, cancellationToken)
            ?? throw new NotFoundAppException("User account was not found.");

        try
        {
            user.EnsureCanLogin();
        }
        catch (BusinessRuleException exception)
        {
            throw new AuthenticationAppException(exception.Message);
        }

        var changeRequest = await MaybeQueueSchoolChangeAsync(
            user,
            activeRole,
            request.SchoolId,
            request.CampusId,
            cancellationToken);

        if (changeRequest is null)
        {
            throw new ValidationAppException([
                "School and campus are unchanged. Choose a different school or campus to request a change.",
            ]);
        }

        var otherRoles = user.Roles.Where(role => role != activeRole).ToList();
        var fullyLockAccount = otherRoles.Count == 0;
        var lockedRoleName = activeRole.ToString();

        if (fullyLockAccount)
        {
            user.SetActive(false);
            await _users.RevokeRefreshTokensForUserAsync(
                user.Id,
                _dateTimeProvider.UtcNow,
                cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return new RequestSchoolChangeResponse(
                changeRequest.Id,
                IsLocked: true,
                LockedPendingSchoolChangeMessage,
                IsAccountFullyLocked: true,
                LockedRole: lockedRoleName);
        }

        // Multi-role: lock only the requesting role; keep account active for other roles.
        await _users.RevokeRefreshTokensForRoleAsync(
            user.Id,
            activeRole,
            _dateTimeProvider.UtcNow,
            cancellationToken);

        var continueAs = ResolveUsableSessionRole(user, preferredRole: null, lockedRole: activeRole);
        var sessionUser = await _users.GetByIdForRoleAsync(user.Id, continueAs, cancellationToken) ?? user;
        var refreshToken = IssueRefreshToken(sessionUser, continueAs);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var message = string.Format(LockedRolePendingSchoolChangeMessageFormat, lockedRoleName);
        return new RequestSchoolChangeResponse(
            changeRequest.Id,
            IsLocked: true,
            message,
            IsAccountFullyLocked: false,
            LockedRole: lockedRoleName,
            AccessToken: _tokenService.CreateAccessToken(sessionUser, continueAs),
            RefreshToken: refreshToken,
            User: await ToCurrentUserResponseAsync(sessionUser, continueAs, cancellationToken));
    }

    /// <inheritdoc />
    public async Task<RequestAdditionalRoleResponse> RequestAdditionalRoleAsync(
        RequestAdditionalRoleRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId ?? throw new AuthenticationAppException("Authentication is required.");
        var activeRole = ResolveActiveRoleFromClaims();
        var user = await _users.GetByIdForRoleAsync(userId, activeRole, cancellationToken)
            ?? throw new NotFoundAppException("User account was not found.");

        try
        {
            user.EnsureCanLogin();
        }
        catch (BusinessRuleException exception)
        {
            throw new AuthenticationAppException(exception.Message);
        }

        if (!Enum.TryParse<UserRole>(request.Role.AsTrimmedString(), true, out var requestedRole)
            || requestedRole is not (UserRole.Teacher or UserRole.Parent or UserRole.Coordinator))
        {
            throw new ValidationAppException(
                ["Requested role must be Parent, Teacher, or Coordinator."]);
        }

        try
        {
            UserRoleRules.EnsureCanAddRole(user.Roles, requestedRole);
        }
        catch (BusinessRuleException exception)
        {
            throw new ValidationAppException([exception.Message]);
        }

        if (requestedRole is UserRole.Teacher or UserRole.Coordinator)
        {
            if (request.SchoolId is null or <= 0 || request.CampusId is null or <= 0)
            {
                throw new ValidationAppException(
                    [
                        requestedRole == UserRole.Coordinator
                            ? "School and campus are required for Coordinator."
                            : "School and campus are required for Teacher.",
                    ]);
            }

            await EnsureCampusBelongsToSchoolForRoleRequestAsync(
                request.SchoolId.Value,
                request.CampusId.Value,
                cancellationToken);
        }

        await _roleRequests.CancelPendingForUserAsync(
            user.Id,
            _dateTimeProvider.UtcNow,
            cancellationToken);

        UserRoleRequest roleRequest;
        try
        {
            roleRequest = UserRoleRequest.Create(
                user.Id,
                requestedRole,
                request.SchoolId,
                request.CampusId,
                request.TeacherCode,
                request.ReasonMessage,
                _dateTimeProvider.UtcNow);
        }
        catch (BusinessRuleException exception)
        {
            throw new ValidationAppException([exception.Message]);
        }

        await _roleRequests.AddAsync(roleRequest, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var recipientIds = await ResolveRoleRequestRecipientIdsAsync(
            roleRequest,
            cancellationToken);
        if (recipientIds.Length > 0)
        {
            await _notifications.CreateAsync(
                recipientIds,
                "Additional role request",
                $"{user.FullName} requested the {requestedRole} role ({user.Username}).",
                RoleRequestCategory,
                cancellationToken);
        }

        return new RequestAdditionalRoleResponse(
            roleRequest.Id,
            requestedRole.ToString(),
            "Your role request was submitted. An admin will review it. Your account stays active.");
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<PendingRoleRequestResponse>> ListPendingRoleRequestsAsync(
        int take,
        CancellationToken cancellationToken)
    {
        EnsureRoleRequestReviewer();

        int? schoolFilter = null;
        int? campusFilter = null;
        if (IsCampusAdmin())
        {
            schoolFilter = _currentUser.SchoolId;
            campusFilter = _currentUser.CampusId;
        }
        else if (IsSchoolAdmin())
        {
            schoolFilter = _currentUser.SchoolId;
        }

        var requests = await _roleRequests.ListPendingAsync(
            take,
            schoolFilter,
            campusFilter,
            cancellationToken);

        var responses = new List<PendingRoleRequestResponse>(requests.Count);
        foreach (var item in requests)
        {
            var user = await _users.GetByIdAsync(item.UserId, cancellationToken);
            if (user is null)
            {
                continue;
            }

            responses.Add(new PendingRoleRequestResponse(
                item.Id,
                item.UserId,
                user.FullName,
                user.Username,
                user.Role.ToString(),
                user.Roles.Select(static role => role.ToString()).ToArray(),
                item.RequestedRole.ToString(),
                item.SchoolId,
                item.CampusId,
                item.TeacherCode,
                item.ReasonMessage,
                item.RequestedAt.ToString("O")));
        }

        return responses;
    }

    /// <inheritdoc />
    public async Task ApproveRoleRequestAsync(long requestId, CancellationToken cancellationToken)
    {
        EnsureRoleRequestReviewer();

        var request = await _roleRequests.GetByIdAsync(requestId, cancellationToken)
            ?? throw new NotFoundAppException("Role request was not found.");

        if (!request.IsPending)
        {
            throw new BusinessRuleException("This role request is no longer pending.");
        }

        EnsureCanReviewRoleRequest(request);

        var user = await _users.GetByIdAsync(request.UserId, cancellationToken)
            ?? throw new NotFoundAppException("User account was not found.");

        try
        {
            UserRoleRules.EnsureCanAddRole(user.Roles, request.RequestedRole);
            user.AddRole(request.RequestedRole, _dateTimeProvider.UtcNow);
        }
        catch (BusinessRuleException exception)
        {
            throw new ValidationAppException([exception.Message]);
        }

        if (request.RequestedRole == UserRole.Teacher)
        {
            var schoolId = request.SchoolId
                ?? throw new ValidationAppException(["School is required for Teacher."]);
            var campusId = request.CampusId
                ?? throw new ValidationAppException(["Campus is required for Teacher."]);
            user.AssignSchoolCampus(schoolId, campusId);
            if (request.TeacherCode.HasTrimmedText())
            {
                user.SetRollNumberTeacherCode(request.TeacherCode);
            }

            if (!await _users.HasTeacherProfileAsync(user.Id, cancellationToken))
            {
                await _users.AddTeacherProfileAsync(
                    new Teacher(user.Id, user.MobileNumber),
                    cancellationToken);
            }

            user.AttachProfileContext(user.Id, schoolId, campusId);
        }
        else if (request.RequestedRole == UserRole.Coordinator)
        {
            var schoolId = request.SchoolId
                ?? throw new ValidationAppException(["School is required for Coordinator."]);
            var campusId = request.CampusId
                ?? throw new ValidationAppException(["Campus is required for Coordinator."]);
            if (!request.TeacherCode.HasTrimmedText())
            {
                throw new ValidationAppException(["Coordinator code is required."]);
            }

            user.AssignSchoolCampus(schoolId, campusId);
            user.SetRollNumberTeacherCode(request.TeacherCode);
            user.AttachProfileContext(user.Id, schoolId, campusId);
        }
        else if (request.RequestedRole == UserRole.Parent)
        {
            if (!await _users.HasParentProfileAsync(user.Id, cancellationToken))
            {
                await _users.AddParentProfileAsync(
                    new Parent(user.Id, user.MobileNumber),
                    cancellationToken);
            }
        }

        var approverId = _currentUser.UserId
            ?? throw new AuthenticationAppException("Authentication is required.");
        request.Approve(approverId, _dateTimeProvider.UtcNow);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _notifications.CreateAsync(
            [user.Id],
            "Role request approved",
            $"Your request for the {request.RequestedRole} role was approved. Switch roles from your profile menu.",
            RoleRequestCategory,
            cancellationToken);
    }

    /// <inheritdoc />
    public async Task RejectRoleRequestAsync(
        long requestId,
        string reason,
        CancellationToken cancellationToken)
    {
        EnsureRoleRequestReviewer();

        var request = await _roleRequests.GetByIdAsync(requestId, cancellationToken)
            ?? throw new NotFoundAppException("Role request was not found.");

        if (!request.IsPending)
        {
            throw new BusinessRuleException("This role request is no longer pending.");
        }

        EnsureCanReviewRoleRequest(request);

        var approverId = _currentUser.UserId
            ?? throw new AuthenticationAppException("Authentication is required.");

        try
        {
            request.Reject(approverId, reason, _dateTimeProvider.UtcNow);
        }
        catch (BusinessRuleException exception)
        {
            throw new ValidationAppException([exception.Message]);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _notifications.CreateAsync(
            [request.UserId],
            "Role request rejected",
            $"Your request for the {request.RequestedRole} role was rejected: {request.RejectionReason}",
            RoleRequestCategory,
            cancellationToken);
    }

    /// <inheritdoc />
    public async Task<CurrentUserResponse> UploadAvatarAsync(
        Stream content,
        string fileName,
        string contentType,
        CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId ?? throw new AuthenticationAppException("Authentication is required.");
        var activeRole = ResolveActiveRoleFromClaims();
        var user = await _users.GetByIdForRoleAsync(userId, activeRole, cancellationToken)
            ?? throw new NotFoundAppException("User account was not found.");

        try
        {
            user.EnsureCanLogin();
        }
        catch (BusinessRuleException exception)
        {
            throw new AuthenticationAppException(exception.Message);
        }

        if (content is null || content.Length == 0)
        {
            throw new ValidationAppException(["Avatar image is required."]);
        }

        var normalizedType = contentType.AsTrimmedOrNull()?.ToLowerInvariant() ?? "image/jpeg";
        if (!normalizedType.StartsWith("image/", StringComparison.Ordinal))
        {
            throw new ValidationAppException(["Avatar must be an image file."]);
        }

        var url = await _fileStorage.SaveAsync(content, fileName, normalizedType, cancellationToken);
        user.SetAvatarUrl(url);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await ToCurrentUserResponseAsync(user, activeRole, cancellationToken);
    }

    /// <inheritdoc />
    public async Task DeactivateAccountAsync(
        DeactivateAccountRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId ?? throw new AuthenticationAppException("Authentication is required.");
        var user = await _users.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundAppException("User account was not found.");

        if (user.HasRole(UserRole.PortalAdmin))
        {
            throw new ForbiddenAppException("Portal Admin accounts cannot be deactivated.");
        }

        try
        {
            user.EnsureCanLogin();
            user.EnsureHasPassword();
        }
        catch (BusinessRuleException exception)
        {
            throw new AuthenticationAppException(exception.Message);
        }

        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
        {
            throw new ValidationAppException(["Current password is required to deactivate your account."]);
        }

        if (!_passwordHasher.Verify(request.CurrentPassword, user.PasswordHash!))
        {
            throw new ValidationAppException(["Current password is incorrect."]);
        }

        user.SetActive(false);
        await _users.RevokeRefreshTokensForUserAsync(user.Id, _dateTimeProvider.UtcNow, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<PendingSchoolChangeResponse>> ListPendingSchoolChangesAsync(
        int take,
        CancellationToken cancellationToken)
    {
        EnsureRegistrationReviewer();

        var safeTake = Math.Clamp(take, 1, 100);
        int? schoolIdFilter = null;
        int? campusIdFilter = null;
        if (IsCampusAdmin())
        {
            schoolIdFilter = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
            campusIdFilter = _currentUser.CampusId
                ?? throw new ForbiddenAppException("Campus context was not found.");
        }
        else if (IsSchoolAdmin())
        {
            schoolIdFilter = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
        }

        var requests = await _schoolChanges.ListPendingAsync(
            safeTake,
            schoolIdFilter,
            campusIdFilter,
            cancellationToken);

        var viewerId = _currentUser.UserId
            ?? throw new AuthenticationAppException("Authentication is required.");
        if (!Enum.TryParse<UserRole>(_currentUser.Role, true, out var viewerRole))
        {
            throw new ForbiddenAppException("Approver role was not found.");
        }

        var responses = new List<PendingSchoolChangeResponse>(requests.Count);
        foreach (var request in requests)
        {
            var user = await _users.GetByIdAsync(request.UserId, cancellationToken);
            if (user is null)
            {
                continue;
            }

            var pendingApprovers = await _schoolChanges.ListPendingApproversForRequestAsync(
                request.Id,
                cancellationToken);
            var approvers = pendingApprovers
                .Select(candidate => new PendingApproverResponse(
                    candidate.UserId,
                    candidate.FullName,
                    candidate.Username,
                    candidate.Role.ToString()))
                .ToArray();

            var currentUserHasApproved = await _schoolChanges.HasApprovedAsync(
                request.Id,
                viewerId,
                viewerRole,
                cancellationToken);
            var schoolAdminHasApproved = await _schoolChanges.HasRoleApprovedAsync(
                request.Id,
                UserRole.SchoolAdmin,
                cancellationToken);

            responses.Add(new PendingSchoolChangeResponse(
                request.Id,
                request.UserId,
                user.FullName,
                user.Username,
                request.RequesterRole.ToString(),
                request.FromSchoolId,
                request.FromCampusId,
                request.ToSchoolId,
                request.ToCampusId,
                request.RequestedAt.ToString("O"),
                approvers,
                currentUserHasApproved,
                schoolAdminHasApproved));
        }

        return responses;
    }

    /// <inheritdoc />
    public async Task<ApproveSchoolChangeResponse> ApproveSchoolChangeAsync(
        long requestId,
        CancellationToken cancellationToken)
    {
        EnsureRegistrationReviewer();

        var request = await _schoolChanges.GetByIdAsync(requestId, cancellationToken)
            ?? throw new NotFoundAppException("School change request was not found.");

        if (!request.IsPending)
        {
            throw new BusinessRuleException("This school change request is no longer pending.");
        }

        EnsureCanReviewSchoolChange(request);

        var approverId = _currentUser.UserId
            ?? throw new AuthenticationAppException("Authentication is required.");
        if (!Enum.TryParse<UserRole>(_currentUser.Role, true, out var approverRole))
        {
            throw new ForbiddenAppException("Approver role was not found.");
        }

        var pendingApproval = await _schoolChanges.GetPendingApprovalAsync(
            request.Id,
            approverId,
            approverRole,
            cancellationToken);
        if (pendingApproval is not null)
        {
            pendingApproval.MarkApproved(_dateTimeProvider.UtcNow);
        }
        else if (await _schoolChanges.HasApprovedAsync(request.Id, approverId, approverRole, cancellationToken))
        {
            // Already approved earlier. Appliers may still finalize if allowed.
            if (!CanApplySchoolChange(request, approverRole))
            {
                throw new BusinessRuleException(
                    "You already approved this request. It stays pending until an admin who can apply the destination change finalizes it.");
            }
        }
        else
        {
            var approval = Approval.CreatePendingSchoolChange(request.Id, approverId, approverRole);
            approval.MarkApproved(_dateTimeProvider.UtcNow);
            await _schoolChanges.AddApprovalsAsync([approval], cancellationToken);
        }

        // PortalAdmin applies any request.
        // SchoolAdmin applies inbound Teacher/Student/CampusAdmin for their school.
        // CampusAdmin applies inbound Teacher/Student for their campus.
        if (!CanApplySchoolChange(request, approverRole))
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return new ApproveSchoolChangeResponse(
                request.Id,
                request.UserId,
                IsApplied: false,
                Message:
                    "Your approval was recorded. The change stays pending until School Admin or Portal Admin applies it.");
        }

        var user = await _users.GetByIdAsync(request.UserId, cancellationToken)
            ?? throw new NotFoundAppException("User account was not found.");

        user.ApplySchoolCampus(request.ToSchoolId, request.ToCampusId);
        request.Approve(_dateTimeProvider.UtcNow);
        if (!user.IsActive)
        {
            user.SetActive(true);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new ApproveSchoolChangeResponse(
            request.Id,
            request.UserId,
            IsApplied: true,
            Message: "School/campus change approved and applied. The account is unlocked.");
    }

    /// <inheritdoc />
    public async Task RejectSchoolChangeAsync(
        long requestId,
        bool leaveWithoutSchool,
        CancellationToken cancellationToken)
    {
        EnsureRegistrationReviewer();

        var request = await _schoolChanges.GetByIdAsync(requestId, cancellationToken)
            ?? throw new NotFoundAppException("School change request was not found.");

        if (!request.IsPending)
        {
            throw new BusinessRuleException("This school change request is no longer pending.");
        }

        EnsureCanReviewSchoolChange(request);

        var approverId = _currentUser.UserId
            ?? throw new AuthenticationAppException("Authentication is required.");
        if (!Enum.TryParse<UserRole>(_currentUser.Role, true, out var approverRole))
        {
            throw new ForbiddenAppException("Approver role was not found.");
        }

        var pendingApproval = await _schoolChanges.GetPendingApprovalAsync(
            request.Id,
            approverId,
            approverRole,
            cancellationToken);
        if (pendingApproval is not null)
        {
            pendingApproval.MarkRejected(_dateTimeProvider.UtcNow);
        }
        else
        {
            var approval = Approval.CreatePendingSchoolChange(request.Id, approverId, approverRole);
            approval.RecordRejected(_dateTimeProvider.UtcNow);
            await _schoolChanges.AddApprovalsAsync([approval], cancellationToken);
        }

        request.Reject(_dateTimeProvider.UtcNow);

        var user = await _users.GetByIdAsync(request.UserId, cancellationToken);
        if (user is not null)
        {
            // Rejected destination change: unlock the account.
            // Optionally clear school/campus (student may continue without a school).
            if (leaveWithoutSchool && request.RequesterRole == UserRole.Student)
            {
                user.ApplySchoolCampus(schoolId: null, campusId: null);
            }

            if (!user.IsActive)
            {
                user.SetActive(true);
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <inheritdoc />
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
            return user.ToCurrentUserResponse(ResolveActiveRoleFromClaims());
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

        return user.ToCurrentUserResponse(ResolveActiveRoleFromClaims());
    }

    /// <inheritdoc />
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
        string? mobileNumber,
        CancellationToken cancellationToken)
    {
        switch (user.Role)
        {
            case UserRole.Student:
                if (await _users.HasStudentProfileAsync(user.Id, cancellationToken))
                {
                    throw new BusinessRuleException("Student profile already exists.");
                }

                if (user.RegistrationGrade is not > 0
                    || !user.RegistrationSection.HasTrimmedText())
                {
                    throw new ValidationAppException([
                        "This student registration is missing grade/section. Ask the student to submit a new request."]);
                }

                await _users.AddStudentProfileAsync(
                    new Student(
                        user.Id,
                        user.RegistrationGrade.Value,
                        user.RegistrationSection!,
                        mobileNumber),
                    cancellationToken);
                user.AttachProfileContext(user.Id, user.SchoolId, user.CampusId);
                break;

            case UserRole.Teacher:
                if (await _users.HasTeacherProfileAsync(user.Id, cancellationToken))
                {
                    throw new BusinessRuleException("Teacher profile already exists.");
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
        if (IsCampusAdmin())
        {
            EnsureCampusAdminCanReview(user);
            return;
        }

        if (!IsSchoolAdmin())
        {
            return;
        }

        // No school on the request → PortalAdmin only.
        if (IsPortalOnlyRegistration(user))
        {
            throw new ForbiddenAppException(
                "Requests without a school can only be approved by Portal Admin.");
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
        if (IsCampusAdmin())
        {
            EnsureCampusAdminCanReview(user);
            return;
        }

        if (!IsSchoolAdmin())
        {
            return;
        }

        if (IsPortalOnlyRegistration(user))
        {
            throw new ForbiddenAppException(
                "Requests without a school can only be rejected by Portal Admin.");
        }

        var adminSchoolId = _currentUser.SchoolId
            ?? throw new ForbiddenAppException("School context was not found.");

        if (!user.SchoolId.HasValue || user.SchoolId != adminSchoolId)
        {
            throw new ForbiddenAppException("You can only reject registrations for your school.");
        }
    }

    private void EnsureCampusAdminCanReview(User user)
    {
        if (IsPortalOnlyRegistration(user))
        {
            throw new ForbiddenAppException(
                "Requests without a school can only be reviewed by Portal Admin.");
        }

        if (!user.CampusId.HasValue)
        {
            throw new ForbiddenAppException(
                "School-only requests can only be reviewed by School Admin or Portal Admin.");
        }

        var adminSchoolId = _currentUser.SchoolId
            ?? throw new ForbiddenAppException("School context was not found.");
        var adminCampusId = _currentUser.CampusId
            ?? throw new ForbiddenAppException("Campus context was not found.");

        if (!user.SchoolId.HasValue || user.SchoolId != adminSchoolId)
        {
            throw new ForbiddenAppException("You can only review registrations for your school.");
        }

        if (user.CampusId != adminCampusId)
        {
            throw new ForbiddenAppException("You can only review registrations for your campus.");
        }
    }

    /// <summary>No school selected → approval queue is PortalAdmin only.</summary>
    private static bool IsPortalOnlyRegistration(User user)
        => !user.SchoolId.HasValue;

    /// <summary>
    /// Who can activate a pending registration after recording approval:
    /// PortalAdmin — any request;
    /// SchoolAdmin — Student/Teacher with a school in their scope;
    /// CampusAdmin — Student/Teacher with a campus in their scope;
    /// Parent / no-school requests — PortalAdmin only.
    /// </summary>
    private static bool CanActivateRegistration(User user, UserRole approverRole)
    {
        if (approverRole == UserRole.PortalAdmin)
        {
            return true;
        }

        if (user.Role == UserRole.Parent || IsPortalOnlyRegistration(user))
        {
            return false;
        }

        // Student and Teacher may be activated by destination school/campus admins.
        if (user.Role is not (UserRole.Student or UserRole.Teacher))
        {
            return false;
        }

        if (approverRole == UserRole.CampusAdmin)
        {
            return user.CampusId.HasValue;
        }

        if (approverRole == UserRole.SchoolAdmin)
        {
            return user.SchoolId.HasValue;
        }

        return false;
    }

    private async Task<CurrentUserResponse> ToCurrentUserResponseAsync(
        User user,
        UserRole activeRole,
        CancellationToken cancellationToken)
    {
        var pending = await _schoolChanges.GetPendingForUserAsync(user.Id, cancellationToken);
        CurrentUserPendingSchoolChange? pendingDto = null;
        if (pending is not null)
        {
            pendingDto = new CurrentUserPendingSchoolChange(
                pending.Id,
                pending.ToSchoolId,
                pending.ToCampusId,
                pending.RequestedAt.ToString("O"),
                pending.Status.ToString(),
                pending.RequesterRole.ToString(),
                IsAccountFullyLocked: !user.IsActive);
        }

        var pendingRole = await _roleRequests.GetPendingForUserAsync(user.Id, cancellationToken);
        CurrentUserPendingRoleRequest? pendingRoleDto = null;
        if (pendingRole is not null)
        {
            pendingRoleDto = new CurrentUserPendingRoleRequest(
                pendingRole.Id,
                pendingRole.RequestedRole.ToString(),
                pendingRole.SchoolId,
                pendingRole.CampusId,
                pendingRole.TeacherCode,
                pendingRole.ReasonMessage,
                pendingRole.RequestedAt.ToString("O"));
        }

        return user.ToCurrentUserResponse(activeRole, pendingDto, pendingRoleDto);
    }

    private async Task<UserRole?> GetPendingSchoolChangeLockedRoleAsync(
        long userId,
        CancellationToken cancellationToken)
    {
        var pending = await _schoolChanges.GetPendingForUserAsync(userId, cancellationToken);
        return pending?.RequesterRole;
    }

    /// <summary>
    /// Older school-change flow deactivated the whole account. For multi-role users with a
    /// pending transfer, reopen the account and keep only the requesting role locked.
    /// </summary>
    private async Task<bool> TryConvertFullSchoolChangeLockToRoleScopedAsync(
        User user,
        CancellationToken cancellationToken)
    {
        if (user.IsActive)
        {
            return false;
        }

        var pending = await _schoolChanges.GetPendingForUserAsync(user.Id, cancellationToken);
        if (pending is null)
        {
            return false;
        }

        if (!user.Roles.Any(role => role != pending.RequesterRole))
        {
            return false;
        }

        user.SetActive(true);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return true;
    }

    /// <summary>
    /// Picks a session role that is assigned and not locked by a pending school-change.
    /// </summary>
    private static UserRole ResolveUsableSessionRole(
        User user,
        UserRole? preferredRole,
        UserRole? lockedRole)
    {
        if (preferredRole.HasValue
            && user.HasRole(preferredRole.Value)
            && preferredRole != lockedRole)
        {
            return preferredRole.Value;
        }

        var unlocked = user.Roles
            .Where(role => lockedRole is null || role != lockedRole)
            .ToList();
        if (unlocked.Count > 0)
        {
            return unlocked[0];
        }

        // Fallback (should only happen if locked role is the sole role — login already blocked).
        return user.Role;
    }

    private async Task<string?> TryGetPendingSchoolChangeLockMessageAsync(
        User user,
        CancellationToken cancellationToken)
    {
        if (user.IsPendingRegistration || user.IsRejectedRegistration)
        {
            return null;
        }

        var pending = await _schoolChanges.GetPendingForUserAsync(user.Id, cancellationToken);
        if (pending is null)
        {
            return null;
        }

        // Multi-role: other roles remain usable — do not treat as full-account lock.
        if (user.Roles.Any(role => role != pending.RequesterRole))
        {
            return null;
        }

        if (user.IsActive)
        {
            return null;
        }

        return LockedPendingSchoolChangeMessage;
    }

    private async Task<UserSchoolChangeRequest?> MaybeQueueSchoolChangeAsync(
        User user,
        UserRole activeRole,
        int? requestedSchoolId,
        int? requestedCampusId,
        CancellationToken cancellationToken)
    {
        // PortalAdmin / SchoolAdmin / Parent cannot change school/campus via this flow.
        // Parent accounts are not school-scoped (registration never assigns school/campus).
        if (activeRole is UserRole.PortalAdmin
            or UserRole.SchoolAdmin
            or UserRole.Parent)
        {
            throw new ForbiddenAppException("Your role cannot request a school or campus change.");
        }

        var canRequest = activeRole is UserRole.Student
            or UserRole.Teacher
            or UserRole.Coordinator
            or UserRole.CampusAdmin;

        if (!canRequest)
        {
            throw new ForbiddenAppException("Your role cannot request a school or campus change.");
        }

        int? toSchoolId;
        int? toCampusId;

        if (activeRole == UserRole.CampusAdmin)
        {
            // CampusAdmin: school stays fixed; campus change is requestable.
            toSchoolId = user.SchoolId;
            toCampusId = requestedCampusId;
        }
        else
        {
            toSchoolId = requestedSchoolId;
            toCampusId = toSchoolId.HasValue ? requestedCampusId : null;
        }

        if (toSchoolId == user.SchoolId && toCampusId == user.CampusId)
        {
            return null;
        }

        // No-op when request body omitted school fields (null/null) and user has none.
        if (!toSchoolId.HasValue
            && !toCampusId.HasValue
            && !user.SchoolId.HasValue
            && !user.CampusId.HasValue)
        {
            return null;
        }

        // Validate destination before locking the account — fake/inactive school or campus
        // IDs would otherwise queue a change with no matching School/Campus reviewers.
        await EnsureActiveSchoolCampusDestinationAsync(toSchoolId, toCampusId, cancellationToken);

        try
        {
            await _schoolChanges.CancelPendingForUserAsync(
                user.Id,
                _dateTimeProvider.UtcNow,
                cancellationToken);

            var changeRequest = UserSchoolChangeRequest.Create(
                user.Id,
                user.SchoolId,
                user.CampusId,
                toSchoolId,
                toCampusId,
                activeRole,
                _dateTimeProvider.UtcNow);

            await _schoolChanges.AddAsync(changeRequest, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // CampusAdmin campus moves → SchoolAdmin + PortalAdmin only (no campus filter).
            var candidateCampusId =
                changeRequest.RequesterRole == UserRole.CampusAdmin
                    ? null
                    : changeRequest.ToCampusId;

            var candidates = await _users.ListPendingApproverCandidatesAsync(
                changeRequest.ToSchoolId,
                candidateCampusId,
                cancellationToken);

            if (changeRequest.RequesterRole == UserRole.CampusAdmin)
            {
                candidates = candidates
                    .Where(candidate => candidate.Role != UserRole.CampusAdmin)
                    .ToList();
            }

            var approvals = candidates
                .Select(candidate => Approval.CreatePendingSchoolChange(
                    changeRequest.Id,
                    candidate.UserId,
                    candidate.Role))
                .ToList();

            if (approvals.Count > 0)
            {
                await _schoolChanges.AddApprovalsAsync(approvals, cancellationToken);
            }

            var recipientIds = candidates.Select(candidate => candidate.UserId).Distinct().ToArray();
            if (recipientIds.Length > 0)
            {
                await _notifications.CreateAsync(
                    recipientIds,
                    "School/campus change request",
                    $"{user.FullName} requested a school/campus change ({user.Username}).",
                    SchoolChangeRequestCategory,
                    cancellationToken);
            }

            return changeRequest;
        }
        catch (BusinessRuleException exception)
        {
            throw new ValidationAppException([exception.Message]);
        }
    }

    private void EnsureCanReviewSchoolChange(UserSchoolChangeRequest request)
    {
        if (string.Equals(_currentUser.Role, UserRole.PortalAdmin.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (IsSchoolAdmin())
        {
            var adminSchoolId = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
            if (request.ToSchoolId != adminSchoolId)
            {
                throw new ForbiddenAppException("You can only review changes for your school.");
            }

            return;
        }

        if (IsCampusAdmin())
        {
            if (request.RequesterRole == UserRole.CampusAdmin)
            {
                throw new ForbiddenAppException("Campus admins cannot review other campus admin change requests.");
            }

            var adminSchoolId = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
            var adminCampusId = _currentUser.CampusId
                ?? throw new ForbiddenAppException("Campus context was not found.");
            if (request.ToSchoolId != adminSchoolId || request.ToCampusId != adminCampusId)
            {
                throw new ForbiddenAppException("You can only review changes for your campus.");
            }

            return;
        }

        throw new ForbiddenAppException("You are not allowed to review school change requests.");
    }

    /// <summary>
    /// Who can apply (unlock + move school/campus), after review scope checks:
    /// PortalAdmin — any request;
    /// SchoolAdmin — Teacher/Student/CampusAdmin into their school;
    /// CampusAdmin — Teacher/Student into their campus.
    /// Parent cannot request school/campus change.
    /// </summary>
    private static bool CanApplySchoolChange(UserSchoolChangeRequest request, UserRole approverRole)
    {
        if (approverRole == UserRole.PortalAdmin)
        {
            return true;
        }

        if (approverRole == UserRole.SchoolAdmin)
        {
            return request.RequesterRole is UserRole.Teacher
                or UserRole.Student
                or UserRole.CampusAdmin;
        }

        if (approverRole == UserRole.CampusAdmin)
        {
            return request.RequesterRole is UserRole.Teacher or UserRole.Student;
        }

        return false;
    }

    private void EnsureRoleRequestReviewer()
    {
        EnsureRegistrationReviewer();
    }

    private void EnsureCanReviewRoleRequest(UserRoleRequest request)
    {
        if (string.Equals(_currentUser.Role, UserRole.PortalAdmin.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (IsCampusAdmin())
        {
            if (request.CampusId is not null
                && _currentUser.CampusId is not null
                && request.CampusId != _currentUser.CampusId)
            {
                throw new ForbiddenAppException("You can only review role requests for your campus.");
            }

            return;
        }

        if (IsSchoolAdmin())
        {
            if (request.SchoolId is not null
                && _currentUser.SchoolId is not null
                && request.SchoolId != _currentUser.SchoolId)
            {
                throw new ForbiddenAppException("You can only review role requests for your school.");
            }

            return;
        }

        throw new ForbiddenAppException("Only admins can review role requests.");
    }

    private async Task EnsureCampusBelongsToSchoolForRoleRequestAsync(
        int schoolId,
        int campusId,
        CancellationToken cancellationToken)
    {
        var campus = await _directory.GetCampusAsync(campusId, cancellationToken)
            ?? throw new NotFoundAppException("Campus was not found.");
        if (campus.SchoolId != schoolId)
        {
            throw new ValidationAppException(["Campus must belong to the selected school."]);
        }

        if (!await _directory.SchoolExistsAsync(schoolId, cancellationToken))
        {
            throw new NotFoundAppException("School was not found.");
        }
    }

    private async Task<long[]> ResolveRoleRequestRecipientIdsAsync(
        UserRoleRequest request,
        CancellationToken cancellationToken)
    {
        var candidates = await _users.ListPendingApproverCandidatesAsync(
            request.SchoolId,
            request.CampusId,
            cancellationToken);

        return candidates
            .Where(candidate =>
                candidate.Role is UserRole.PortalAdmin or UserRole.SchoolAdmin or UserRole.CampusAdmin)
            .Select(candidate => candidate.UserId)
            .Distinct()
            .ToArray();
    }

    private void EnsureRegistrationReviewer()
    {
        var role = _currentUser.Role;
        if (!string.Equals(role, UserRole.PortalAdmin.ToString(), StringComparison.OrdinalIgnoreCase)
            && !string.Equals(role, UserRole.SchoolAdmin.ToString(), StringComparison.OrdinalIgnoreCase)
            && !string.Equals(role, UserRole.CampusAdmin.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            throw new ForbiddenAppException("Only admins can review registration requests.");
        }
    }

    /// <summary>
    /// Who may complete a password reset for the target account:
    /// PortalAdmin — any;
    /// SchoolAdmin — Student / Teacher / CampusAdmin in school (not SchoolAdmin / PortalAdmin);
    /// CampusAdmin — Student / Teacher in campus;
    /// Parent — linked Student only.
    /// </summary>
    private static bool RoleCanClearPasswordForUser(UserRole clearerRole, User target)
    {
        if (clearerRole == UserRole.PortalAdmin)
        {
            return true;
        }

        if (target.HasRole(UserRole.PortalAdmin) || target.HasRole(UserRole.SchoolAdmin))
        {
            // SchoolAdmin passwords: PortalAdmin only.
            return false;
        }

        if (clearerRole == UserRole.SchoolAdmin)
        {
            // SchoolAdmin may clear Student, Teacher, CampusAdmin, Parent in school.
            return true;
        }

        if (clearerRole == UserRole.CampusAdmin)
        {
            return target.HasRole(UserRole.Student) || target.HasRole(UserRole.Teacher);
        }

        if (clearerRole == UserRole.Parent)
        {
            return target.HasRole(UserRole.Student);
        }

        return false;
    }

    private async Task EnsureCanClearPasswordForResetAsync(User user, CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<UserRole>(_currentUser.Role, true, out var clearerRole))
        {
            throw new ForbiddenAppException("You are not allowed to clear passwords for reset.");
        }

        if (!RoleCanClearPasswordForUser(clearerRole, user))
        {
            if (user.HasRole(UserRole.PortalAdmin))
            {
                throw new ForbiddenAppException("Only Portal Admin can reset a Portal Admin password.");
            }

            if (clearerRole == UserRole.CampusAdmin
                && (user.HasRole(UserRole.SchoolAdmin) || user.HasRole(UserRole.CampusAdmin)))
            {
                throw new ForbiddenAppException(
                    "Campus admins cannot reset School Admin or Campus Admin passwords.");
            }

            if (clearerRole == UserRole.Parent)
            {
                throw new ForbiddenAppException("Parents can only reset passwords for linked students.");
            }

            throw new ForbiddenAppException("You are not allowed to clear passwords for reset.");
        }

        if (clearerRole == UserRole.PortalAdmin)
        {
            return;
        }

        if (clearerRole == UserRole.Parent)
        {
            var parentId = _currentUser.ProfileId
                ?? _currentUser.UserId
                ?? throw new ForbiddenAppException("Parent profile was not found.");
            if (!await _studentScope.IsLinkedStudentAsync(parentId, user.Id, cancellationToken))
            {
                throw new ForbiddenAppException("Parents can only reset passwords for linked students.");
            }

            return;
        }

        if (clearerRole == UserRole.SchoolAdmin)
        {
            var adminSchoolId = _currentUser.SchoolId
                ?? throw new ForbiddenAppException("School context was not found.");
            if (user.SchoolId != adminSchoolId)
            {
                throw new ForbiddenAppException("You can only reset passwords for users in your school.");
            }

            return;
        }

        // CampusAdmin — role rules already passed; enforce campus scope.
        var campusSchoolId = _currentUser.SchoolId
            ?? throw new ForbiddenAppException("School context was not found.");
        var campusId = _currentUser.CampusId
            ?? throw new ForbiddenAppException("Campus context was not found.");
        if (user.SchoolId != campusSchoolId || user.CampusId != campusId)
        {
            throw new ForbiddenAppException("You can only reset passwords for users in your campus.");
        }
    }

    private bool IsSchoolAdmin()
        => string.Equals(_currentUser.Role, UserRole.SchoolAdmin.ToString(), StringComparison.OrdinalIgnoreCase);

    private bool IsCampusAdmin()
        => string.Equals(_currentUser.Role, UserRole.CampusAdmin.ToString(), StringComparison.OrdinalIgnoreCase);

    private static UserRole ParseRegistrationRole(string userType)
    {
        if (!Enum.TryParse<UserRole>(userType.AsTrimmedString(), true, out var role)
            || !AllowedRegistrationRoles.Contains(role.ToString(), StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationAppException(["User type must be Student, Parent, or Teacher."]);
        }

        return role;
    }

    private string IssueRefreshToken(User user, UserRole activeRole)
    {
        var refreshToken = _tokenService.CreateRefreshToken();
        var tokenHash = _tokenService.HashToken(refreshToken);
        user.AddRefreshToken(new RefreshToken(
            user.Id,
            tokenHash,
            _dateTimeProvider.UtcNow.Add(RefreshTokenLifetime),
            activeRole));
        return refreshToken;
    }

    private UserRole ResolveActiveRoleFromClaims()
    {
        if (!string.IsNullOrWhiteSpace(_currentUser.Role)
            && Enum.TryParse<UserRole>(_currentUser.Role, true, out var role))
        {
            return role;
        }

        return UserRole.Student;
    }

    /// <summary>
    /// Ensures destination school/campus IDs refer to existing, active records and that
    /// the campus belongs to the school. Prevents registration / school-change queues from
    /// locking accounts against destinations that have no matching reviewers.
    /// </summary>
    private async Task EnsureActiveSchoolCampusDestinationAsync(
        int? schoolId,
        int? campusId,
        CancellationToken cancellationToken)
    {
        if (!schoolId.HasValue && !campusId.HasValue)
        {
            return;
        }

        if (campusId.HasValue && !schoolId.HasValue)
        {
            throw new ValidationAppException(["School is required when a campus is selected."]);
        }

        if (schoolId.HasValue)
        {
            if (schoolId.Value <= 0)
            {
                throw new ValidationAppException(["School is invalid."]);
            }

            var school = await _directory.GetSchoolAsync(schoolId.Value, cancellationToken);
            if (school is null)
            {
                throw new ValidationAppException(["School was not found."]);
            }

            if (!school.IsActive)
            {
                throw new ValidationAppException(["School is inactive. Choose an active school."]);
            }
        }

        if (!campusId.HasValue)
        {
            return;
        }

        if (campusId.Value <= 0)
        {
            throw new ValidationAppException(["Campus is invalid."]);
        }

        var campus = await _directory.GetCampusAsync(campusId.Value, cancellationToken);
        if (campus is null)
        {
            throw new ValidationAppException(["Campus was not found."]);
        }

        if (campus.SchoolId != schoolId!.Value)
        {
            throw new ValidationAppException(["Campus must belong to the selected school."]);
        }

        if (!campus.IsActive)
        {
            throw new ValidationAppException(["Campus is inactive. Choose an active campus."]);
        }
    }

    private static void ValidateLogin(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username))
        {
            throw new ValidationAppException(["Username is required."]);
        }
    }

    private static void ValidateRegistration(RegisterAccountRequest request)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            errors.Add("Full name is required.");
        }

        UserRole? role = null;
        if (string.IsNullOrWhiteSpace(request.UserType))
        {
            errors.Add("User type is required.");
        }
        else if (!Enum.TryParse<UserRole>(request.UserType.AsTrimmedString(), true, out var parsedRole)
            || !AllowedRegistrationRoles.Contains(parsedRole.ToString(), StringComparer.OrdinalIgnoreCase))
        {
            errors.Add("User type must be Student, Parent, or Teacher.");
        }
        else
        {
            role = parsedRole;
        }

        // Username is always the email for Student / Parent / Teacher.
        if (!request.EmailAddress.AsNormalizedEmailOrNull().HasTrimmedText())
        {
            errors.Add("Email address is required (it is the username).");
        }

        if (role == UserRole.Parent)
        {
            if (request.SchoolId.HasValue || request.CampusId.HasValue)
            {
                errors.Add("School and campus are not used for Parent account requests.");
            }

            if (request.RollNumberTeacherCode.HasTrimmedText())
            {
                errors.Add("Roll number / teacher code is not used for Parent account requests.");
            }

            if (request.Grade.HasValue || request.Section.HasTrimmedText())
            {
                errors.Add("Grade and section are only used for Student account requests.");
            }
        }
        else if (role == UserRole.Student || role == UserRole.Teacher)
        {
            if (request.CampusId.HasValue && !request.SchoolId.HasValue)
            {
                errors.Add("School is required when a campus is selected.");
            }

            if (request.SchoolId.HasValue && request.SchoolId.Value <= 0)
            {
                errors.Add("School is invalid.");
            }

            if (request.CampusId.HasValue && request.CampusId.Value <= 0)
            {
                errors.Add("Campus is invalid.");
            }

            // Roll number only when the student belongs to a school.
            if (role == UserRole.Student
                && request.SchoolId.HasValue
                && !request.RollNumberTeacherCode.HasTrimmedText())
            {
                errors.Add("Roll number is required when a school is selected.");
            }

            if (role == UserRole.Student)
            {
                if (request.Grade is not > 0)
                {
                    errors.Add("Grade is required for Student account requests.");
                }

                if (!request.Section.HasTrimmedText())
                {
                    errors.Add("Section is required for Student account requests.");
                }
            }
            else if (request.Grade.HasValue || request.Section.HasTrimmedText())
            {
                errors.Add("Grade and section are only used for Student account requests.");
            }
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
