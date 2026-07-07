using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Contracts.Questions;
using RankUpEducation.Contracts.Quizzes;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Questions;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Questions;

public interface IQuestionService
{
    Task<QuizQuestionListResponse> ListForQuizAsync(long quizId, CancellationToken cancellationToken);

    Task<ManageQuizResponse> AddToQuizAsync(
        long quizId,
        AddQuizQuestionRequest request,
        CancellationToken cancellationToken);

    Task<ManageQuizResponse> UpdateOnQuizAsync(
        long quizId,
        long questionId,
        UpdateQuizQuestionRequest request,
        CancellationToken cancellationToken);

    Task<ManageQuizResponse> RemoveFromQuizAsync(
        long quizId,
        long questionId,
        CancellationToken cancellationToken);
}

public sealed class QuestionService : IQuestionService
{
    private readonly IQuizRepository _quizzes;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly QuizManageGuard _guard;

    public QuestionService(
        IQuizRepository quizzes,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser)
    {
        _quizzes = quizzes;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _guard = new QuizManageGuard(quizzes);
    }

    public async Task<QuizQuestionListResponse> ListForQuizAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        await _guard.RequireOwnedQuizAsync(quizId, scope, cancellationToken);

        var questions = await _quizzes.GetQuizQuestionsAsync(quizId, cancellationToken);
        return QuestionMapping.ToListResponse(quizId, questions);
    }

    public async Task<ManageQuizResponse> AddToQuizAsync(
        long quizId,
        AddQuizQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        var quiz = await _guard.RequireEditableQuizAsync(quizId, scope, cancellationToken);
        QuizManageGuard.ValidateQuestionRequest(request);

        var questionTypeId = await _guard.ResolveQuestionTypeIdAsync(request.QuestionType, cancellationToken);
        var questionStatusId = await _guard.RequireLookupAsync(
            QuizLookupNames.QuestionStatus,
            QuizLookupNames.ActiveQuestionStatusNames,
            cancellationToken);

        var question = new Question(
            request.QuestionText,
            questionTypeId,
            quiz.ClassId,
            quiz.SubjectId,
            quiz.TopicId,
            quiz.DifficultyLevelId,
            questionStatusId,
            scope.UserId.ToString(),
            request.EstimatedTimeSeconds,
            request.Marks);

        question.UpdateDetails(
            request.QuestionText,
            questionTypeId,
            quiz.ClassId,
            quiz.SubjectId,
            quiz.TopicId,
            quiz.DifficultyLevelId,
            request.EstimatedTimeSeconds,
            request.Marks,
            request.Hint,
            request.Explanation);

        await _quizzes.AddQuestionAsync(question, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var options = request.Options
            .Select(option => new QuestionOption(question.Id, option.OptionText, option.IsCorrect))
            .ToArray();
        if (options.Length > 0)
        {
            await _quizzes.AddQuestionOptionsAsync(options, cancellationToken);
        }

        var existingQuestions = await _quizzes.GetQuizQuestionsAsync(quizId, cancellationToken);
        var displayOrder = (short)(existingQuestions.Count + 1);
        var quizQuestion = new QuizQuestion(quizId, question.Id, displayOrder, request.Marks);
        await _quizzes.AddQuizQuestionAsync(quizQuestion, cancellationToken);
        await _quizzes.RecalculateQuizTotalsAsync(quizId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await BuildManageResponseAsync(quizId, scope, cancellationToken);
    }

    public async Task<ManageQuizResponse> UpdateOnQuizAsync(
        long quizId,
        long questionId,
        UpdateQuizQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        await _guard.RequireEditableQuizAsync(quizId, scope, cancellationToken);
        QuizManageGuard.ValidateQuestionRequest(request);

        var link = await _quizzes.GetQuizQuestionLinkAsync(quizId, questionId, cancellationToken)
            ?? throw new NotFoundAppException("Question was not found on this quiz.");

        var question = await _quizzes.GetQuestionEntityAsync(questionId, cancellationToken)
            ?? throw new NotFoundAppException("Question was not found.");

        if (!string.Equals(question.CreatedBy, scope.UserId.ToString(), StringComparison.Ordinal))
        {
            throw new ForbiddenAppException("You can only edit questions you created.");
        }

        var questionTypeId = await _guard.ResolveQuestionTypeIdAsync(request.QuestionType, cancellationToken);
        question.UpdateDetails(
            request.QuestionText,
            questionTypeId,
            question.ClassId,
            question.SubjectId,
            question.TopicId,
            question.DifficultyLevel,
            request.EstimatedTimeSeconds,
            request.Marks,
            request.Hint,
            request.Explanation);

        await _quizzes.RemoveQuestionOptionsAsync(questionId, cancellationToken);
        var options = request.Options
            .Select(option => new QuestionOption(questionId, option.OptionText, option.IsCorrect))
            .ToArray();
        if (options.Length > 0)
        {
            await _quizzes.AddQuestionOptionsAsync(options, cancellationToken);
        }

        link.SetMarks(request.Marks);

        await _quizzes.RecalculateQuizTotalsAsync(quizId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await BuildManageResponseAsync(quizId, scope, cancellationToken);
    }

    public async Task<ManageQuizResponse> RemoveFromQuizAsync(
        long quizId,
        long questionId,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        await _guard.RequireEditableQuizAsync(quizId, scope, cancellationToken);

        var link = await _quizzes.GetQuizQuestionLinkAsync(quizId, questionId, cancellationToken)
            ?? throw new NotFoundAppException("Question was not found on this quiz.");

        await _quizzes.RemoveQuizQuestionLinkAsync(link, cancellationToken);

        var question = await _quizzes.GetQuestionEntityAsync(questionId, cancellationToken);
        if (question is not null && string.Equals(question.CreatedBy, scope.UserId.ToString(), StringComparison.Ordinal))
        {
            question.Deactivate();
        }

        await _quizzes.RecalculateQuizTotalsAsync(quizId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await BuildManageResponseAsync(quizId, scope, cancellationToken);
    }

    private async Task<ManageQuizResponse> BuildManageResponseAsync(
        long quizId,
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        var detail = await _quizzes.GetDetailForCreatorAsync(quizId, scope.UserId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");

        var questions = await _quizzes.GetQuizQuestionsAsync(quizId, cancellationToken);
        return QuizManageMapping.ToManageResponse(detail, questions);
    }
}
