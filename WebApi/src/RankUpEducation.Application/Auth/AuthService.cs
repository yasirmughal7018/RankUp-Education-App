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
    private const string SchoolChangeRequestCategory = "SchoolChangeRequest";
    private const string LockedPendingSchoolChangeMessage =
        "Your account is locked because you requested a school or campus change. School Admin or Portal Admin must approve (or reject) the change before you can sign in again.";

    private readonly IUserRepository _users;
    private readonly ISchoolChangeRequestRepository _schoolChanges;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ICurrentUserService _currentUser;
    private readonly INotificationService _notifications;
    private readonly IFileStorageService _fileStorage;
    private readonly IUnitOfWork _unitOfWork;

    public AuthService(
        IUserRepository users,
        ISchoolChangeRequestRepository schoolChanges,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        IDateTimeProvider dateTimeProvider,
        ICurrentUserService currentUser,
        INotificationService notifications,
        IFileStorageService fileStorage,
        IUnitOfWork unitOfWork)
    {
        _users = users;
        _schoolChanges = schoolChanges;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _dateTimeProvider = dateTimeProvider;
        _currentUser = currentUser;
        _notifications = notifications;
        _fileStorage = fileStorage;
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

        var activeRole = user.Role;
        var refreshToken = IssueRefreshToken(user, activeRole);
        user.RecordLogin(_dateTimeProvider.UtcNow);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var sessionUser = await _users.GetByIdForRoleAsync(user.Id, activeRole, cancellationToken) ?? user;

        return new LoginResponse(
            _tokenService.CreateAccessToken(sessionUser, activeRole),
            refreshToken,
            sessionUser.ToCurrentUserResponse(activeRole));
    }

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
            user.EnsureCanLogin();
            user.EnsureHasRole(targetRole);
        }
        catch (BusinessRuleException exception)
        {
            throw new AuthenticationAppException(exception.Message);
        }

        var sessionUser = await _users.GetByIdForRoleAsync(user.Id, targetRole, cancellationToken) ?? user;
        var refreshToken = IssueRefreshToken(sessionUser, targetRole);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new LoginResponse(
            _tokenService.CreateAccessToken(sessionUser, targetRole),
            refreshToken,
            sessionUser.ToCurrentUserResponse(targetRole));
    }

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
            return new LoginStatusResponse(
                "Rejected",
                "Your registration request was rejected. You may submit a new request.");
        }

        if (user.IsPendingRegistration)
        {
            return new LoginStatusResponse(
                "PendingApproval",
                "Your login is not approved yet. Please wait for admin approval.");
        }

        if (!user.IsActive)
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

        // Parent: never school/campus.
        // Student/Teacher: school and campus are optional; they drive the approval queue.
        var schoolId = role == UserRole.Parent ? null : request.SchoolId;
        var campusId = role == UserRole.Parent || !schoolId.HasValue
            ? null
            : request.CampusId;
        var rollNumberTeacherCode = role == UserRole.Parent
            ? null
            : request.RollNumberTeacherCode;

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
            rollNumberTeacherCode);

        await _users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Approval queue lives only in app_user_approval:
        // no school → PortalAdmin;
        // school only → SchoolAdmin + PortalAdmin;
        // campus → CampusAdmin + SchoolAdmin + PortalAdmin.
        // Only PortalAdmin approval activates the account.
        var approverCandidates = await _users.ListPendingApproverCandidatesAsync(
            user.SchoolId,
            user.CampusId,
            cancellationToken);
        if (approverCandidates.Count > 0)
        {
            var approvalRows = approverCandidates
                .Select(candidate => UserApproval.CreatePending(
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

            responses.Add(pendingUser.ToPendingResponse(approvers, currentUserHasApproved));
        }

        return responses;
    }

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

        // Record this admin's approval in app_user_approval.
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
                "Approved — awaiting Portal Admin.");
        }
        else
        {
            // Legacy request without a queue row for this approver.
            var approval = UserApproval.CreatePending(user.Id, approverId, approverRole);
            approval.MarkApproved(_dateTimeProvider.UtcNow);
            await _users.AddApprovalAsync(approval, cancellationToken);
        }

        // Activation rules:
        // - PortalAdmin approve → activate immediately (School/Campus not required).
        // - SchoolAdmin / CampusAdmin approve → record only; wait for PortalAdmin.
        // - CampusAdmin approve does not require SchoolAdmin (PortalAdmin still required).
        if (approverRole != UserRole.PortalAdmin)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return new ApproveRegistrationResponse(
                user.Id,
                user.Username,
                user.FullName,
                IsActivated: false,
                Message:
                    "Your approval was recorded. The account stays pending until Portal Admin approves.");
        }

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

        return new ApproveRegistrationResponse(
            user.Id,
            user.Username,
            user.FullName,
            IsActivated: true,
            Message:
                "Registration approved by Portal Admin. The user can set their initial password and sign in.");
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
            approval.RecordRejected(rejectedAt);
        }
        else
        {
            var rejection = UserApproval.CreatePending(user.Id, rejectorId, rejectorRole);
            rejection.MarkRejected(rejectedAt);
            await _users.AddApprovalAsync(rejection, cancellationToken);
        }

        user.RejectPendingRegistration(rejectedAt);
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
        var activeRole = storedToken.ActiveRole ?? user.Role;
        if (!user.HasRole(activeRole))
        {
            activeRole = user.Role;
        }

        storedToken.Revoke(_dateTimeProvider.UtcNow);
        var sessionUser = await _users.GetByIdForRoleAsync(user.Id, activeRole, cancellationToken) ?? user;
        var refreshToken = IssueRefreshToken(sessionUser, activeRole);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new AuthTokensResponse(_tokenService.CreateAccessToken(sessionUser, activeRole), refreshToken);
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
        var activeRole = ResolveActiveRoleFromClaims();
        var user = await _users.GetByIdForRoleAsync(userId, activeRole, cancellationToken)
            ?? throw new NotFoundAppException("User account was not found.");

        return await ToCurrentUserResponseAsync(user, activeRole, cancellationToken);
    }

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

        if (string.IsNullOrWhiteSpace(request.MobileNumber))
        {
            throw new ValidationAppException(["Mobile number is required."]);
        }

        var mobileNumber = request.MobileNumber.AsTrimmedString();
        var cnic = request.Cnic.AsTrimmedOrNull();
        var emailAddress = request.EmailAddress.AsNormalizedEmailOrNull();

        var existingMobile = await _users.GetByMobileNumberAsync(mobileNumber, cancellationToken);
        if (existingMobile is not null && existingMobile.Id != user.Id)
        {
            throw new ValidationAppException(["An account already exists for this mobile number."]);
        }

        if (cnic is not null)
        {
            var existingCnic = await _users.GetByCnicAsync(cnic, cancellationToken);
            if (existingCnic is not null && existingCnic.Id != user.Id)
            {
                throw new ValidationAppException(["An account already exists for this CNIC."]);
            }
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

        user.SetActive(false);
        await _users.RevokeRefreshTokensForUserAsync(
            user.Id,
            _dateTimeProvider.UtcNow,
            cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new RequestSchoolChangeResponse(
            changeRequest.Id,
            IsLocked: true,
            LockedPendingSchoolChangeMessage);
    }

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
            // Already soft-approved (e.g. legacy flow). Appliers may still finalize.
            if (!CanApplySchoolChange(request, approverRole))
            {
                throw new BusinessRuleException(
                    "You already approved this request. It stays pending until School Admin or Portal Admin applies it.");
            }
        }
        else
        {
            var approval = UserSchoolChangeApproval.CreatePending(request.Id, approverId, approverRole);
            approval.MarkApproved(_dateTimeProvider.UtcNow);
            await _schoolChanges.AddApprovalsAsync([approval], cancellationToken);
        }

        // Teacher/Student (and Parent/CampusAdmin) school or campus changes:
        // SchoolAdmin OR PortalAdmin can apply. CampusAdmin records soft-approval only.
        if (!CanApplySchoolChange(request, approverRole))
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return new ApproveSchoolChangeResponse(
                request.Id,
                request.UserId,
                IsApplied: false,
                Message:
                    "Your approval was recorded. The change stays pending until School Admin or Portal Admin approves.");
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

    public async Task RejectSchoolChangeAsync(
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
            pendingApproval.MarkRejected(_dateTimeProvider.UtcNow);
        }
        else
        {
            var approval = UserSchoolChangeApproval.CreatePending(request.Id, approverId, approverRole);
            approval.RecordRejected(_dateTimeProvider.UtcNow);
            await _schoolChanges.AddApprovalsAsync([approval], cancellationToken);
        }

        request.Reject(_dateTimeProvider.UtcNow);

        var user = await _users.GetByIdAsync(request.UserId, cancellationToken);
        if (user is not null && !user.IsActive)
        {
            user.SetActive(true);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
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
                pending.Status.ToString());
        }

        return user.ToCurrentUserResponse(activeRole, pendingDto);
    }

    private async Task<string?> TryGetPendingSchoolChangeLockMessageAsync(
        User user,
        CancellationToken cancellationToken)
    {
        if (user.IsActive || user.IsPendingRegistration || user.IsRejectedRegistration)
        {
            return null;
        }

        var pending = await _schoolChanges.GetPendingForUserAsync(user.Id, cancellationToken);
        return pending is null ? null : LockedPendingSchoolChangeMessage;
    }

    private async Task<UserSchoolChangeRequest?> MaybeQueueSchoolChangeAsync(
        User user,
        UserRole activeRole,
        int? requestedSchoolId,
        int? requestedCampusId,
        CancellationToken cancellationToken)
    {
        // PortalAdmin / SchoolAdmin cannot change school/campus via this flow.
        if (activeRole is UserRole.PortalAdmin or UserRole.SchoolAdmin)
        {
            throw new ForbiddenAppException("Your role cannot request a school or campus change.");
        }

        var canRequest = activeRole is UserRole.Student
            or UserRole.Teacher
            or UserRole.Parent
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
                .Select(candidate => UserSchoolChangeApproval.CreatePending(
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
    /// Teacher/Student school or campus changes (also Parent/CampusAdmin requests):
    /// SchoolAdmin or PortalAdmin may apply. CampusAdmin soft-approves only.
    /// </summary>
    private static bool CanApplySchoolChange(UserSchoolChangeRequest request, UserRole approverRole)
    {
        if (approverRole == UserRole.PortalAdmin)
        {
            return true;
        }

        if (approverRole != UserRole.SchoolAdmin)
        {
            return false;
        }

        return request.RequesterRole is UserRole.Teacher
            or UserRole.Student
            or UserRole.Parent
            or UserRole.CampusAdmin;
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

            if (role == UserRole.Student && !request.RollNumberTeacherCode.HasTrimmedText())
            {
                errors.Add("Roll number is required for Student account requests.");
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
