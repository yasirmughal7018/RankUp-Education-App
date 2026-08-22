using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Lookups;
using RankUpEducation.Application.Questions;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Contracts.Questions;
using RankUpEducation.Contracts.QuizQuestions;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

/// <summary>
/// Centralized edit/delete guards: ownership via <see cref="QuizScopeResolver"/>, lifecycle checks,
/// and lookup resolution for quiz manage flows.
/// </summary>
internal sealed class QuizManageGuard
{
    private readonly IQuizRepository _quizzes;
    private readonly ILookupRepository _lookups;
    private readonly IQuizEditRequestRepository? _editRequests;

    public QuizManageGuard(
        IQuizRepository quizzes,
        ILookupRepository lookups,
        IQuizEditRequestRepository? editRequests = null)
    {
        _quizzes = quizzes;
        _lookups = lookups;
        _editRequests = editRequests;
    }

    internal sealed record EditableQuiz(Quiz Quiz, QuizEditRequest? Grant);

    public async Task<Quiz> RequireOwnedQuizAsync(
        long quizId,
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        if (quizId <= 0)
        {
            throw new NotFoundAppException("Quiz was not found.");
        }

        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken);
        if (quiz is null)
        {
            throw new NotFoundAppException($"Quiz #{quizId} was not found.");
        }

        QuizScopeResolver.EnsureOwnsQuiz(quiz, scope);
        await EnsureDraftVisibleAsync(quiz, scope, cancellationToken);
        return quiz;
    }

    /// <summary>
    /// Draft quizzes are owner-only until Submit for approval. PortalAdmin may then open
    /// pipeline drafts (submitted Pending, SchoolApproved, Approved, Rejected).
    /// </summary>
    public async Task EnsureDraftVisibleAsync(
        Quiz quiz,
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        if (!IsDraftLifecycle(lifecycleName))
        {
            return;
        }

        if (QuizScopeResolver.IsQuizOwner(quiz, scope))
        {
            return;
        }

        if (scope.Role != UserRole.PortalAdmin)
        {
            throw new NotFoundAppException($"Quiz #{quiz.Id} was not found.");
        }

        var approvalName = await _lookups.GetLookupNameAsync(quiz.ApprovalStatusId, cancellationToken);
        var hasSubmitted = await _quizzes.HasSubmittedForReviewAsync(quiz.Id, cancellationToken);
        if (QuizDraftVisibility.IsVisibleToNonOwner(approvalName, hasSubmitted))
        {
            return;
        }

        throw new NotFoundAppException($"Quiz #{quiz.Id} was not found.");
    }

    public async Task<Quiz> RequireEditableQuizAsync(
        long quizId,
        QuizManageScope scope,
        CancellationToken cancellationToken)
        => (await RequireEditableQuizContextAsync(quizId, scope, cancellationToken)).Quiz;

    public async Task<EditableQuiz> RequireEditableQuizContextAsync(
        long quizId,
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        var quiz = await RequireOwnedQuizAsync(quizId, scope, cancellationToken);
        var grant = scope.Role == UserRole.PortalAdmin || _editRequests is null
            ? null
            : await _editRequests.GetUnusedGrantAsync(quiz.Id, scope.UserId, cancellationToken);

        if (grant is null)
        {
            QuizScopeResolver.EnsureCanEditQuizSettings(quiz, scope);
        }
        else if (!QuizScopeResolver.IsQuizOwner(quiz, scope))
        {
            throw new ForbiddenAppException("Only the quiz owner can use an approved edit grant.");
        }

        await EnsureEditableLifecycleAsync(quiz, grant, cancellationToken);
        await EnsureOwnerEditNotLockedAsync(quiz, scope, grant, cancellationToken);
        return new EditableQuiz(quiz, grant);
    }

    public async Task ConsumeEditGrantAsync(
        Quiz quiz,
        QuizEditRequest grant,
        CancellationToken cancellationToken)
    {
        if (_editRequests is null)
        {
            return;
        }

        var now = DateTimeOffset.UtcNow;
        grant.MarkEditUsed(now);
        var pendingApprovalStatusId = await RequireQuizApprovalStatusAsync(
            LookupNames.QuizApprovalStatusIds.Pending,
            LookupNames.PendingApprovalStatusNames,
            cancellationToken);
        var draftLifecycleStatusId = await RequireLookupAsync(
            LookupNames.QuizLifecycleStatus,
            LookupNames.DraftLifecycleNames,
            cancellationToken);
        quiz.RevertAfterGrantedEdit(draftLifecycleStatusId, pendingApprovalStatusId);
        await _editRequests.CancelPendingForQuizAsync(
            quiz.Id,
            now,
            grant.Id,
            "The quiz is no longer approved or published.",
            cancellationToken);
    }

    public async Task EnsureNotArchivedAsync(Quiz quiz, CancellationToken cancellationToken)
    {
        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        if (IsArchivedLifecycle(lifecycleName))
        {
            throw new BusinessRuleException("Archived quizzes are read-only.");
        }
    }

    public async Task EnsureDraftOnlyAsync(Quiz quiz, CancellationToken cancellationToken)
    {
        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        if (!IsDraftLifecycle(lifecycleName))
        {
            throw new BusinessRuleException("Only draft quizzes can be deleted.");
        }
    }

    public async Task<short> RequireLookupAsync(
        string type,
        IReadOnlyList<string> names,
        CancellationToken cancellationToken)
    {
        var id = await _lookups.ResolveLookupIdByNamesAsync(type, names, 0, cancellationToken);
        if (id == 0)
        {
            throw new BusinessRuleException($"Required lookup '{type}' ({string.Join(", ", names)}) was not found.");
        }

        return id;
    }

    /// <summary>Resolves a quiz approval lookup by canonical id first, then by write names.</summary>
    public async Task<short> RequireQuizApprovalStatusAsync(
        short preferredId,
        IReadOnlyList<string> names,
        CancellationToken cancellationToken)
    {
        var preferred = await _lookups.GetByIdAndTypeAsync(
            preferredId,
            LookupNames.QuizApprovalStatus,
            cancellationToken);
        if (preferred is not null)
        {
            return preferred.Id;
        }

        return await RequireLookupAsync(LookupNames.QuizApprovalStatus, names, cancellationToken);
    }

    public async Task<short> ResolveQuestionTypeIdAsync(string questionType, CancellationToken cancellationToken)
    {
        var normalized = questionType.AsTrimmedString();

        // Accept canonical IDs (100–108) when callers pass numeric values (e.g. Excel).
        if (short.TryParse(normalized, out var typedId))
        {
            var byId = await _lookups.GetByIdAndTypeAsync(
                typedId,
                LookupNames.QuestionType,
                cancellationToken);
            if (byId is not null)
            {
                return EnsureSupportedQuestionTypeId(byId.Id, byId.Name);
            }
        }

        (short PreferredId, string[] Names)[] candidateGroups =
        [
            (LookupNames.QuestionTypeIds.SingleChoice, LookupNames.SingleChoiceQuestionTypeNames),
            (LookupNames.QuestionTypeIds.MultipleChoice, LookupNames.MultiSelectQuestionTypeNames),
            (LookupNames.QuestionTypeIds.TrueFalse, LookupNames.TrueFalseQuestionTypeNames),
            (LookupNames.QuestionTypeIds.FillInTheBlanks, LookupNames.FillBlankQuestionTypeNames),
            (LookupNames.QuestionTypeIds.Descriptive, LookupNames.DescriptiveQuestionTypeNames),
            (LookupNames.QuestionTypeIds.FileUpload, LookupNames.FileUploadQuestionTypeNames),
            (LookupNames.QuestionTypeIds.Matching, LookupNames.MatchingQuestionTypeNames),
            (LookupNames.QuestionTypeIds.Ordering, LookupNames.OrderingQuestionTypeNames),
            (LookupNames.QuestionTypeIds.Media, LookupNames.MediaQuestionTypeNames)
        ];

        foreach (var (preferredId, group) in candidateGroups)
        {
            if (group.Any(name => name.Equals(normalized, StringComparison.OrdinalIgnoreCase)))
            {
                return await RequirePreferredLookupAsync(
                    LookupNames.QuestionType,
                    preferredId,
                    group,
                    cancellationToken);
            }
        }

        var directId = await _lookups.ResolveLookupIdAsync(LookupNames.QuestionType, normalized, 0, cancellationToken);
        if (directId == 0)
        {
            throw new ValidationAppException([$"Question type '{questionType}' is not supported."]);
        }

        var resolvedName = await _lookups.GetLookupNameAsync(directId, cancellationToken);
        return EnsureSupportedQuestionTypeId(directId, resolvedName);
    }

    public async Task<short> ResolveDifficultyLevelIdAsync(
        short difficultyLevel,
        CancellationToken cancellationToken)
    {
        var preferred = await _lookups.GetByIdAndTypeAsync(
            difficultyLevel,
            LookupNames.DifficultyLevel,
            cancellationToken);
        if (preferred is not null)
        {
            return preferred.Id;
        }

        var legacyName = await _lookups.GetLookupNameAsync(difficultyLevel, cancellationToken);
        if (!string.IsNullOrWhiteSpace(legacyName))
        {
            if (LookupNames.EasyDifficultyNames.Any(n => n.Equals(legacyName, StringComparison.OrdinalIgnoreCase)))
            {
                return await RequirePreferredLookupAsync(
                    LookupNames.DifficultyLevel,
                    LookupNames.DifficultyLevelIds.Easy,
                    LookupNames.EasyDifficultyNames,
                    cancellationToken);
            }

            if (LookupNames.MediumDifficultyNames.Any(n => n.Equals(legacyName, StringComparison.OrdinalIgnoreCase)))
            {
                return await RequirePreferredLookupAsync(
                    LookupNames.DifficultyLevel,
                    LookupNames.DifficultyLevelIds.Medium,
                    LookupNames.MediumDifficultyNames,
                    cancellationToken);
            }

            if (LookupNames.HardDifficultyNames.Any(n => n.Equals(legacyName, StringComparison.OrdinalIgnoreCase)))
            {
                return await RequirePreferredLookupAsync(
                    LookupNames.DifficultyLevel,
                    LookupNames.DifficultyLevelIds.Hard,
                    LookupNames.HardDifficultyNames,
                    cancellationToken);
            }
        }

        throw new ValidationAppException([
            $"Difficulty level '{difficultyLevel}' is invalid. Use Easy (2001), Medium (2002), or Hard (2003)."
        ]);
    }

    private static short EnsureSupportedQuestionTypeId(short typeId, string resolvedName)
    {
        if (!QuizQuestionHelper.IsSingleChoiceType(resolvedName)
            && !QuizQuestionHelper.IsMultiSelectType(resolvedName)
            && !QuizQuestionHelper.IsTrueFalseType(resolvedName)
            && !QuizQuestionHelper.IsFillBlankType(resolvedName)
            && !QuizQuestionHelper.IsDescriptiveType(resolvedName)
            && !QuizQuestionHelper.IsFileUploadType(resolvedName)
            && !QuizQuestionHelper.IsMatchingType(resolvedName)
            && !QuizQuestionHelper.IsOrderingType(resolvedName)
            && !QuizQuestionHelper.IsMediaType(resolvedName))
        {
            throw new ValidationAppException([
                $"Question type '{resolvedName}' is not supported."
            ]);
        }

        return typeId;
    }

    private async Task<short> RequirePreferredLookupAsync(
        string type,
        short preferredId,
        IReadOnlyList<string> names,
        CancellationToken cancellationToken)
    {
        var preferred = await _lookups.GetByIdAndTypeAsync(preferredId, type, cancellationToken);
        if (preferred is not null)
        {
            return preferred.Id;
        }

        return await RequireLookupAsync(type, names, cancellationToken);
    }

    public static void ValidateQuestionRequest(AddQuizQuestionRequest request)
        => ValidateQuestionPayload(request, offeredForCreate: true);

    public static void ValidateQuestionRequest(UpdateQuizQuestionRequest request)
        => ValidateQuestionPayload(
            new AddQuizQuestionRequest(
                request.QuestionText,
                request.QuestionType,
                request.Marks,
                request.EstimatedTimeSeconds,
                request.Hint,
                request.Explanation,
                request.Options,
                request.AcceptedAnswers),
            offeredForCreate: false);

    private static void ValidateQuestionPayload(
        AddQuizQuestionRequest request,
        bool offeredForCreate)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.QuestionText))
        {
            errors.Add("Question text is required.");
        }

        if (request.Marks <= 0)
        {
            errors.Add("Marks must be greater than zero.");
        }

        if (string.IsNullOrWhiteSpace(request.QuestionType))
        {
            errors.Add("Question type is required.");
        }
        else
        {
            var hidden = offeredForCreate
                ? QuestionBankGuard.HiddenCreateTypeError(request.QuestionType)
                : null;
            if (hidden is not null)
            {
                errors.Add(hidden);
            }
            else
            {
                var optionRequests = request.Options
                    .Select(option => new QuestionOptionRequest(
                        option.OptionText,
                        option.IsCorrect,
                        option.OptionImageUrl))
                    .ToArray();
                errors.AddRange(QuestionBankGuard.ValidateTypeAndAnswersPublic(
                    request.QuestionType,
                    optionRequests,
                    request.AcceptedAnswers));
            }
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
    }

    private async Task EnsureEditableLifecycleAsync(
        Quiz quiz,
        QuizEditRequest? grant,
        CancellationToken cancellationToken)
    {
        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        if (IsArchivedLifecycle(lifecycleName))
        {
            throw new BusinessRuleException("Archived quizzes are read-only.");
        }

        if (!IsEditableLifecycle(lifecycleName)
            && !(grant is not null && IsAssignedLifecycle(lifecycleName)))
        {
            throw new BusinessRuleException("Quiz can only be edited while it is in draft or published state.");
        }

        if (await _quizzes.HasStartedAssignmentsAsync(quiz.Id, DateTimeOffset.UtcNow, cancellationToken))
        {
            // Block edits once any assignment window has opened or attempts exist.
            throw new BusinessRuleException("Quiz cannot be edited after an assignment has started.");
        }
    }

    private async Task EnsureOwnerEditNotLockedAsync(
        Quiz quiz,
        QuizManageScope scope,
        QuizEditRequest? grant,
        CancellationToken cancellationToken)
    {
        if (scope.Role == UserRole.PortalAdmin || grant is not null)
        {
            return;
        }

        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        var approvalName = await _lookups.GetLookupNameAsync(quiz.ApprovalStatusId, cancellationToken);
        if (QuizEditRequestRules.IsLockedForOwnerEdit(lifecycleName, approvalName))
        {
            throw new BusinessRuleException(
                "Approved or published quizzes can only be edited by Portal Admin. Send an edit request with a reason.");
        }
    }

    private static bool IsEditableLifecycle(string lifecycleName)
        => IsDraftLifecycle(lifecycleName) || lifecycleName.Equals("Published", StringComparison.OrdinalIgnoreCase);

    private static bool IsAssignedLifecycle(string lifecycleName)
        => LookupNames.AssignedLifecycleNames.Any(
            name => lifecycleName.Equals(name, StringComparison.OrdinalIgnoreCase));

    private static bool IsDraftLifecycle(string lifecycleName)
        => LookupNames.DraftLifecycleNames.Any(
            name => lifecycleName.Equals(name, StringComparison.OrdinalIgnoreCase));

    private static bool IsArchivedLifecycle(string lifecycleName)
        => lifecycleName.Equals("Archived", StringComparison.OrdinalIgnoreCase);
}
