using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Notifications;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

/// <summary>In-app alerts for quiz publish, approval, and rejection workflow.</summary>
public static class QuizApprovalNotifications
{
    public static Task NotifyApproversOnTeacherPublishAsync(
        INotificationService notifications,
        IUserRepository users,
        Quiz quiz,
        long publisherUserId,
        CancellationToken cancellationToken)
        => NotifyScopedApproversAsync(
            notifications,
            users,
            quiz,
            publisherUserId,
            title: "Quiz pending approval",
            body: $"\"{quiz.QuizTitle}\" was submitted for review.",
            QuizNotificationCategories.QuizPendingApproval,
            includePortalAdmins: true,
            includeSchoolAdmins: true,
            includeCampusAdmins: true,
            cancellationToken);

    public static Task NotifyPortalAdminsOnParentPublishAsync(
        INotificationService notifications,
        IUserRepository users,
        Quiz quiz,
        long publisherUserId,
        CancellationToken cancellationToken)
        => NotifyPortalAdminsOnSubmitForReviewAsync(
            notifications,
            users,
            quiz,
            publisherUserId,
            title: "Parent quiz pending approval",
            cancellationToken);

    /// <summary>SchoolAdmin/CampusAdmin/Parent/Tutor submit — PortalAdmin queue only.</summary>
    public static Task NotifyPortalAdminsOnSubmitForReviewAsync(
        INotificationService notifications,
        IUserRepository users,
        Quiz quiz,
        long publisherUserId,
        CancellationToken cancellationToken)
        => NotifyPortalAdminsOnSubmitForReviewAsync(
            notifications,
            users,
            quiz,
            publisherUserId,
            title: "Quiz pending approval",
            cancellationToken);

    private static Task NotifyPortalAdminsOnSubmitForReviewAsync(
        INotificationService notifications,
        IUserRepository users,
        Quiz quiz,
        long publisherUserId,
        string title,
        CancellationToken cancellationToken)
        => NotifyScopedApproversAsync(
            notifications,
            users,
            quiz,
            publisherUserId,
            title,
            body: $"\"{quiz.QuizTitle}\" was submitted for portal review.",
            QuizNotificationCategories.QuizPendingApproval,
            includePortalAdmins: true,
            includeSchoolAdmins: false,
            includeCampusAdmins: false,
            cancellationToken);

    public static Task NotifyPortalAdminsOnSchoolApprovedAsync(
        INotificationService notifications,
        IUserRepository users,
        Quiz quiz,
        long actorUserId,
        CancellationToken cancellationToken)
        => NotifyScopedApproversAsync(
            notifications,
            users,
            quiz,
            actorUserId,
            title: "Quiz awaiting final approval",
            body: $"\"{quiz.QuizTitle}\" was school-approved and needs portal final approval.",
            QuizNotificationCategories.QuizPendingApproval,
            includePortalAdmins: true,
            includeSchoolAdmins: false,
            includeCampusAdmins: false,
            cancellationToken);

    public static Task NotifyCreatorOnSchoolEndorsedAsync(
        INotificationService notifications,
        Quiz quiz,
        long actorUserId,
        CancellationToken cancellationToken)
        => NotifyCreatorAsync(
            notifications,
            quiz,
            actorUserId,
            title: "Quiz endorsed",
            body: $"\"{quiz.QuizTitle}\" was endorsed by your school. Awaiting portal final approval.",
            QuizNotificationCategories.QuizApproved,
            cancellationToken);

    public static Task NotifyCreatorOnFinalApprovedAsync(
        INotificationService notifications,
        Quiz quiz,
        long actorUserId,
        CancellationToken cancellationToken)
        => NotifyCreatorAsync(
            notifications,
            quiz,
            actorUserId,
            title: "Quiz approved",
            body: $"\"{quiz.QuizTitle}\" was approved. You can assign it to students.",
            QuizNotificationCategories.QuizApproved,
            cancellationToken);

    public static Task NotifyCreatorOnRejectedAsync(
        INotificationService notifications,
        Quiz quiz,
        long actorUserId,
        string reason,
        CancellationToken cancellationToken)
    {
        if (!TryParseCreatorUserId(quiz.CreatedByName, out var creatorId) || creatorId == actorUserId)
        {
            return Task.CompletedTask;
        }

        var trimmedReason = reason.Trim();
        var body = trimmedReason.Length > 0
            ? $"\"{quiz.QuizTitle}\" was rejected: {trimmedReason}"
            : $"\"{quiz.QuizTitle}\" was rejected.";

        return notifications.CreateAsync(
            [creatorId],
            "Quiz rejected",
            body,
            QuizNotificationCategories.QuizRejected,
            cancellationToken);
    }

    private static async Task NotifyScopedApproversAsync(
        INotificationService notifications,
        IUserRepository users,
        Quiz quiz,
        long excludeUserId,
        string title,
        string body,
        string category,
        bool includePortalAdmins,
        bool includeSchoolAdmins,
        bool includeCampusAdmins,
        CancellationToken cancellationToken)
    {
        var candidates = await users.ListPendingApproverCandidatesAsync(
            quiz.SchoolId,
            quiz.SchoolCampusId,
            cancellationToken);

        var recipientIds = candidates
            .Where(candidate =>
                (includePortalAdmins && candidate.Role == UserRole.PortalAdmin)
                || (includeSchoolAdmins && candidate.Role == UserRole.SchoolAdmin)
                || (includeCampusAdmins && candidate.Role == UserRole.CampusAdmin))
            .Select(candidate => candidate.UserId)
            .Where(userId => userId != excludeUserId)
            .Distinct()
            .ToArray();

        await notifications.CreateAsync(recipientIds, title, body, category, cancellationToken);
    }

    private static Task NotifyCreatorAsync(
        INotificationService notifications,
        Quiz quiz,
        long actorUserId,
        string title,
        string body,
        string category,
        CancellationToken cancellationToken)
    {
        if (!TryParseCreatorUserId(quiz.CreatedByName, out var creatorId) || creatorId == actorUserId)
        {
            return Task.CompletedTask;
        }

        return notifications.CreateAsync([creatorId], title, body, category, cancellationToken);
    }

    private static bool TryParseCreatorUserId(string createdByName, out long userId)
    {
        userId = 0;
        return long.TryParse(createdByName, out userId) && userId > 0;
    }
}
