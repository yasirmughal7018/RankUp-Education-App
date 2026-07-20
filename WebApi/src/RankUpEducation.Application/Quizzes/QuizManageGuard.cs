using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Questions;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Contracts.QuizQuestions;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

internal sealed class QuizManageGuard
{
    private readonly IQuizRepository _quizzes;
    private readonly ILookupRepository _lookups;

    public QuizManageGuard(IQuizRepository quizzes, ILookupRepository lookups)
    {
        _quizzes = quizzes;
        _lookups = lookups;
    }

    public async Task<Quiz> RequireOwnedQuizAsync(
        long quizId,
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");

        QuizScopeResolver.EnsureOwnsQuiz(quiz, scope);
        return quiz;
    }

    public async Task<Quiz> RequireEditableQuizAsync(
        long quizId,
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        var quiz = await RequireOwnedQuizAsync(quizId, scope, cancellationToken);
        await EnsureEditableLifecycleAsync(quiz, cancellationToken);
        return quiz;
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

    public async Task<short> ResolveQuestionTypeIdAsync(string questionType, CancellationToken cancellationToken)
    {
        var normalized = questionType.AsTrimmedString();

        // Accept canonical IDs (100–104) when callers pass numeric values (e.g. Excel).
        if (short.TryParse(normalized, out var typedId))
        {
            var byId = await _lookups.GetByIdAndTypeAsync(
                typedId,
                QuizLookupNames.QuestionType,
                cancellationToken);
            if (byId is not null)
            {
                return EnsureSupportedQuestionTypeId(byId.Id, byId.Name);
            }
        }

        (short PreferredId, string[] Names)[] candidateGroups =
        [
            (QuizLookupNames.QuestionTypeIds.SingleChoice, QuizLookupNames.SingleChoiceQuestionTypeNames),
            (QuizLookupNames.QuestionTypeIds.MultipleChoice, QuizLookupNames.MultiSelectQuestionTypeNames),
            (QuizLookupNames.QuestionTypeIds.TrueFalse, QuizLookupNames.TrueFalseQuestionTypeNames),
            (QuizLookupNames.QuestionTypeIds.FillInTheBlanks, QuizLookupNames.FillBlankQuestionTypeNames)
        ];

        foreach (var (preferredId, group) in candidateGroups)
        {
            if (group.Any(name => name.Equals(normalized, StringComparison.OrdinalIgnoreCase)))
            {
                return await RequirePreferredLookupAsync(
                    QuizLookupNames.QuestionType,
                    preferredId,
                    group,
                    cancellationToken);
            }
        }

        var directId = await _lookups.ResolveLookupIdAsync(QuizLookupNames.QuestionType, normalized, 0, cancellationToken);
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
            QuizLookupNames.DifficultyLevel,
            cancellationToken);
        if (preferred is not null)
        {
            return preferred.Id;
        }

        var legacyName = await _lookups.GetLookupNameAsync(difficultyLevel, cancellationToken);
        if (!string.IsNullOrWhiteSpace(legacyName))
        {
            if (QuizLookupNames.EasyDifficultyNames.Any(n => n.Equals(legacyName, StringComparison.OrdinalIgnoreCase)))
            {
                return await RequirePreferredLookupAsync(
                    QuizLookupNames.DifficultyLevel,
                    QuizLookupNames.DifficultyLevelIds.Easy,
                    QuizLookupNames.EasyDifficultyNames,
                    cancellationToken);
            }

            if (QuizLookupNames.MediumDifficultyNames.Any(n => n.Equals(legacyName, StringComparison.OrdinalIgnoreCase)))
            {
                return await RequirePreferredLookupAsync(
                    QuizLookupNames.DifficultyLevel,
                    QuizLookupNames.DifficultyLevelIds.Medium,
                    QuizLookupNames.MediumDifficultyNames,
                    cancellationToken);
            }

            if (QuizLookupNames.HardDifficultyNames.Any(n => n.Equals(legacyName, StringComparison.OrdinalIgnoreCase)))
            {
                return await RequirePreferredLookupAsync(
                    QuizLookupNames.DifficultyLevel,
                    QuizLookupNames.DifficultyLevelIds.Hard,
                    QuizLookupNames.HardDifficultyNames,
                    cancellationToken);
            }
        }

        throw new ValidationAppException([
            $"Difficulty level '{difficultyLevel}' is invalid. Use Easy (2001), Medium (2002), or Hard (2003)."
        ]);
    }

    private static short EnsureSupportedQuestionTypeId(short typeId, string resolvedName)
    {
        if (QuizQuestionHelper.IsDescriptiveType(resolvedName)
            || (!QuizQuestionHelper.IsSingleChoiceType(resolvedName)
                && !QuizQuestionHelper.IsMultiSelectType(resolvedName)
                && !QuizQuestionHelper.IsTrueFalseType(resolvedName)
                && !QuizQuestionHelper.IsFillBlankType(resolvedName)))
        {
            throw new ValidationAppException([
                $"Question type '{resolvedName}' is not available yet. Use Single Choice, Multiple Choice, True/False, or Fill in the Blanks."
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
            errors.AddRange(QuestionBankGuard.ValidateTypeAndOptions(
                request.QuestionType,
                request.Options
                    .Select(option => (option.OptionText, option.IsCorrect))
                    .ToArray()));
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
    }

    public static void ValidateQuestionRequest(UpdateQuizQuestionRequest request)
        => ValidateQuestionRequest(new AddQuizQuestionRequest(
            request.QuestionText,
            request.QuestionType,
            request.Marks,
            request.EstimatedTimeSeconds,
            request.Hint,
            request.Explanation,
            request.Options));

    private async Task EnsureEditableLifecycleAsync(Quiz quiz, CancellationToken cancellationToken)
    {
        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        if (IsArchivedLifecycle(lifecycleName))
        {
            throw new BusinessRuleException("Archived quizzes are read-only.");
        }

        if (!IsEditableLifecycle(lifecycleName))
        {
            throw new BusinessRuleException("Quiz can only be edited while it is in draft or published state.");
        }

        if (await _quizzes.HasStartedAssignmentsAsync(quiz.Id, DateTimeOffset.UtcNow, cancellationToken))
        {
            throw new BusinessRuleException("Quiz cannot be edited after an assignment has started.");
        }
    }

    private static bool IsEditableLifecycle(string lifecycleName)
        => IsDraftLifecycle(lifecycleName) || lifecycleName.Equals("Published", StringComparison.OrdinalIgnoreCase);

    private static bool IsDraftLifecycle(string lifecycleName)
        => lifecycleName.Equals("Draft", StringComparison.OrdinalIgnoreCase);

    private static bool IsArchivedLifecycle(string lifecycleName)
        => lifecycleName.Equals("Archived", StringComparison.OrdinalIgnoreCase);
}
