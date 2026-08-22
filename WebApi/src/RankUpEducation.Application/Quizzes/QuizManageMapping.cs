using RankUpEducation.Application.QuizQuestions;
using RankUpEducation.Contracts.QuizQuestions;
using RankUpEducation.Contracts.Quizzes;
using RankUpEducation.Domain.Approvals;

namespace RankUpEducation.Application.Quizzes;

internal static class QuizManageMapping
{
    public static ManageQuizResponse ToManageResponse(
        QuizDetailItem detail,
        IReadOnlyList<QuizQuestionItem> questions,
        QuizEditRequestSummary? myEditRequest = null,
        bool hasApprovedEditGrant = false,
        IReadOnlyList<QuizEditRequestSummary>? pendingEditRequests = null,
        string? createdByRole = null)
    {
        return new ManageQuizResponse(
            detail.QuizId,
            detail.QuizTitle,
            detail.Description,
            detail.SubjectName,
            detail.GradeName,
            detail.TopicName,
            detail.QuizTypeName,
            detail.DifficultyName,
            detail.LifecycleStatusName,
            detail.ApprovalStatus,
            detail.RejectionReason,
            detail.ClassId,
            detail.SubjectId,
            detail.TopicId,
            detail.DifficultyLevelId,
            detail.TotalQuestions,
            detail.TotalMarks ?? detail.TotalQuestions,
            detail.TimeLimitMinutes,
            detail.AllowedAttempts,
            QuizStatusCalculator.ParseInstructions(detail.Instructions),
            detail.ShuffleQuestions,
            detail.ShuffleOptions,
            detail.IsReviewRequired,
            detail.NavigationMode,
            detail.ReviewDisplayMode,
            detail.RandomQuestionCount,
            detail.CreatedByName,
            ResolveCreatorDisplayName(detail),
            ResolveCreatedAt(detail),
            detail.SchoolName,
            detail.SchoolId,
            detail.CampusId,
            questions.Select(QuizQuestionMapping.ToQuestionResponse).ToArray(),
            (detail.ApprovalHistory ?? Array.Empty<QuizApprovalEventItem>())
                .Select(entry => new QuizApprovalHistoryItem(
                    entry.ApprovalId,
                    entry.Action.ToString(),
                    entry.ActorUserId,
                    entry.ActorName,
                    entry.ActorRole.ToString(),
                    entry.Reason,
                    entry.OccurredAt))
                .ToArray(),
            myEditRequest,
            hasApprovedEditGrant,
            pendingEditRequests,
            createdByRole);
    }

    private static string ResolveCreatorDisplayName(QuizDetailItem detail)
    {
        if (!string.IsNullOrWhiteSpace(detail.CreatorDisplayName))
        {
            return detail.CreatorDisplayName.Trim();
        }

        var createdEvent = detail.ApprovalHistory?
            .FirstOrDefault(entry => entry.Action == ApprovalAction.Created);
        if (!string.IsNullOrWhiteSpace(createdEvent?.ActorName))
        {
            return createdEvent.ActorName.Trim();
        }

        return detail.CreatedByName.Trim();
    }

    private static DateTimeOffset ResolveCreatedAt(QuizDetailItem detail)
    {
        if (detail.CreatedAt is not null)
        {
            return detail.CreatedAt.Value;
        }

        var createdEvent = detail.ApprovalHistory?
            .FirstOrDefault(entry => entry.Action == ApprovalAction.Created);
        return createdEvent?.OccurredAt ?? DateTimeOffset.UtcNow;
    }

    public static QuizAssignmentResponse ToAssignmentResponse(QuizAssignmentListItem item)
        => new(
            item.AssignmentId,
            item.StudentId,
            item.StudentName,
            item.StudentGroupId,
            item.StartDateTime,
            item.EndDateTime,
            item.AllowedAttempts,
            item.AttemptCount,
            item.IsReviewDone,
            item.QuizResultStatusName);
}
