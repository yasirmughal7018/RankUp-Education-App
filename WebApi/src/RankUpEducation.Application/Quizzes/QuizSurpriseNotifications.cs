using RankUpEducation.Application.Notifications;

namespace RankUpEducation.Application.Quizzes;

/// <summary>Sends “quiz available now” notices when Surprise windows open.</summary>
public static class QuizSurpriseNotifications
{
    public static async Task NotifyNewlyOpenedAsync(
        INotificationService notifications,
        IReadOnlyList<QuizAssignmentOpenedNotice> opened,
        CancellationToken cancellationToken)
    {
        if (opened.Count == 0)
        {
            return;
        }

        foreach (var group in opened.GroupBy(item => (item.QuizId, item.QuizTitle)))
        {
            var studentIds = group.Select(item => item.StudentId).Distinct().ToArray();
            await notifications.CreateAsync(
                studentIds,
                "Surprise quiz is open",
                $"\"{group.Key.QuizTitle}\" is available now. Open My Quizzes to start.",
                QuizNotificationCategories.QuizAssigned,
                cancellationToken);
        }
    }
}
