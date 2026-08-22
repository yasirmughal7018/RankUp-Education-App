using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Lookups;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

/// <summary>Delete and archive eligibility by creator type, approval tier, and actor role.</summary>
public static class QuizDeleteArchiveRules
{
    public static void EnsureCanDeleteOrArchive(
        Quiz quiz,
        QuizManageScope scope,
        string lifecycleName,
        string approvalName,
        bool isParentPrivateQuiz)
    {
        if (scope.Role == UserRole.PortalAdmin)
        {
            return;
        }

        if (isParentPrivateQuiz)
        {
            throw new ForbiddenAppException("Only a portal admin can delete or archive parent quizzes.");
        }

        if (!QuizScopeResolver.IsQuizOwner(quiz, scope))
        {
            throw new ForbiddenAppException(
                "Only the quiz owner or a portal admin can delete or archive this quiz.");
        }

        if (IsDraftLifecycle(lifecycleName))
        {
            return;
        }

        if (LookupNames.IsFinalApprovedName(approvalName))
        {
            return;
        }

        throw new ForbiddenAppException(
            "Only a portal admin can delete or archive a published quiz that is not yet approved.");
    }

    private static bool IsDraftLifecycle(string lifecycleName)
        => LookupNames.DraftLifecycleNames.Any(
            name => lifecycleName.Equals(name, StringComparison.OrdinalIgnoreCase));
}
