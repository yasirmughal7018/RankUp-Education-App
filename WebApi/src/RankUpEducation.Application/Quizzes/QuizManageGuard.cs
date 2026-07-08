using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
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
        var normalized = questionType.Trim();
        if (QuizLookupNames.McqQuestionTypeNames.Any(name => name.Equals(normalized, StringComparison.OrdinalIgnoreCase)))
        {
            return await RequireLookupAsync(
                QuizLookupNames.QuestionType,
                QuizLookupNames.McqQuestionTypeNames,
                cancellationToken);
        }

        if (QuizLookupNames.DescriptiveQuestionTypeNames.Any(name => name.Equals(normalized, StringComparison.OrdinalIgnoreCase)))
        {
            return await RequireLookupAsync(
                QuizLookupNames.QuestionType,
                QuizLookupNames.DescriptiveQuestionTypeNames,
                cancellationToken);
        }

        var directId = await _lookups.ResolveLookupIdAsync(QuizLookupNames.QuestionType, normalized, 0, cancellationToken);
        if (directId == 0)
        {
            throw new ValidationAppException([$"Question type '{questionType}' is not supported."]);
        }

        return directId;
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

        if (request.Options.Count > 0 && !request.Options.Any(option => option.IsCorrect))
        {
            errors.Add("At least one option must be marked correct.");
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
