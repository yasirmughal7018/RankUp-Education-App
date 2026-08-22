using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Lookups;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

/// <summary>
/// Delete and archive eligibility. PortalAdmin may archive any quiz.
/// Other roles may only delete their own Draft.
/// Published or Assigned quizzes (including any student/child assignment) are PortalAdmin-only.
/// </summary>
public static class QuizDeleteArchiveRules
{
    public static void EnsureCanDeleteOrArchive(
        Quiz quiz,
        QuizManageScope scope,
        string lifecycleName,
        string approvalName)
    {
        if (scope.Role == UserRole.PortalAdmin)
        {
            return;
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

        throw new ForbiddenAppException(
            "Only a portal admin can archive a published or assigned quiz.");
    }

    private static bool IsDraftLifecycle(string lifecycleName)
        => LookupNames.DraftLifecycleNames.Any(
            name => lifecycleName.Equals(name, StringComparison.OrdinalIgnoreCase));
}
