using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Auth;

public static class AuthPermissions
{
    public static IReadOnlyList<string> ForRole(UserRole role)
    {
        return role switch
        {
            UserRole.PortalAdmin =>
            [
                "platform.manage",
                "school.manage",
                "user.manage",
                "registration.review",
                "report.view"
            ],
            UserRole.SchoolAdmin =>
            [
                "school.manage",
                "user.manage",
                "registration.review",
                "report.view",
                "quiz.manage",
                "worksheet.manage"
            ],
            UserRole.CampusAdmin =>
            [
                "campus.manage",
                "user.manage",
                "registration.review"
            ],
            UserRole.Teacher =>
            [
                "dashboard.view",
                "quiz.create",
                "quiz.assign",
                "quiz.review",
                "worksheet.create",
                "worksheet.review",
                "attendance.mark",
                "message.send",
                "discussion.moderate"
            ],
            UserRole.Student =>
            [
                "dashboard.view",
                "quiz.attempt",
                "worksheet.submit",
                "message.send",
                "discussion.participate",
                "ranking.view"
            ],
            UserRole.Parent =>
            [
                "dashboard.view",
                "child.view",
                "goal.create",
                "message.send",
                "quiz.assign-private",
                "worksheet.assign-private"
            ],
            _ => Array.Empty<string>()
        };
    }
}
