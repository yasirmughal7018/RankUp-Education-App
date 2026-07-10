using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Contracts.QuizQuestions;
using RankUpEducation.Contracts.Quizzes;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Questions;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.QuizQuestions;

public interface IQuizQuestionService
{
    Task<QuizQuestionListResponse> ListForQuizAsync(long quizId, CancellationToken cancellationToken);

    Task<ManageQuizResponse> AddToQuizAsync(
        long quizId,
        AddQuizQuestionRequest request,
        CancellationToken cancellationToken);

    Task<ManageQuizResponse> AttachBankQuestionAsync(
        long quizId,
        AttachBankQuestionRequest request,
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

public sealed class QuizQuestionService : IQuizQuestionService
{
    private readonly IQuizRepository _quizzes;
    private readonly IQuizQuestionRepository _quizQuestions;
    private readonly IQuestionRepository _questions;
    private readonly ILookupRepository _lookups;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly QuizManageGuard _guard;

    public QuizQuestionService(
        IQuizRepository quizzes,
        IQuizQuestionRepository quizQuestions,
        IQuestionRepository questions,
        ILookupRepository lookups,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser)
    {
        _quizzes = quizzes;
        _quizQuestions = quizQuestions;
        _questions = questions;
        _lookups = lookups;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _guard = new QuizManageGuard(quizzes, lookups);
    }

    public async Task<QuizQuestionListResponse> ListForQuizAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        await _guard.RequireOwnedQuizAsync(quizId, scope, cancellationToken);

        var questions = await _quizQuestions.GetQuizQuestionsAsync(quizId, cancellationToken, includeInactive: true);
        return QuizQuestionMapping.ToListResponse(quizId, questions);
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

        // Inline quiz questions are created ready for use (both approval flags).
        question.MarkFullyApproved(scope.UserId.ToString(), questionStatusId);

        await _questions.AddQuestionAsync(question, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        await ReplaceOptionsAsync(question.Id, request.Options, cancellationToken);

        var existingQuestions = await _quizQuestions.GetQuizQuestionsAsync(quizId, cancellationToken, includeInactive: true);
        var displayOrder = (short)(existingQuestions.Count + 1);
        await _quizQuestions.AddQuizQuestionAsync(
            new QuizQuestion(quizId, question.Id, displayOrder, request.Marks),
            cancellationToken);
        await _quizQuestions.RecalculateQuizTotalsAsync(quizId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await BuildManageResponseAsync(quizId, scope, cancellationToken);
    }

    public async Task<ManageQuizResponse> AttachBankQuestionAsync(
        long quizId,
        AttachBankQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(_currentUser);
        var quiz = await _guard.RequireEditableQuizAsync(quizId, scope, cancellationToken);

        if (request.QuestionId <= 0)
        {
            throw new ValidationAppException(["QuestionId is required."]);
        }

        var question = await _questions.GetQuestionEntityForManageAsync(request.QuestionId, cancellationToken)
            ?? throw new NotFoundAppException("Question was not found.");

        if (!question.IsActive)
        {
            throw new BusinessRuleException("Only active questions can be attached to a quiz.");
        }

        var statusName = await _lookups.GetLookupNameAsync(question.StatusId, cancellationToken);
        var isApprovedStatus = QuizLookupNames.ApprovedQuestionStatusNames.Any(name =>
            name.Equals(statusName, StringComparison.OrdinalIgnoreCase));
        if (!isApprovedStatus)
        {
            throw new BusinessRuleException("Only approved question-bank items can be attached to a quiz.");
        }

        if (!question.IsEligibleForQuiz)
        {
            throw new BusinessRuleException(
                "Question must be both human-approved (ApprovedBy) and AI-approved before it can be added to a quiz.");
        }

        if (question.ClassId != quiz.ClassId || question.SubjectId != quiz.SubjectId)
        {
            throw new BusinessRuleException(
                "Question class/subject must match the quiz class/subject.");
        }

        var existingLink = await _quizQuestions.GetQuizQuestionLinkAsync(
            quizId,
            request.QuestionId,
            cancellationToken);
        if (existingLink is not null)
        {
            throw new BusinessRuleException("This question is already on the quiz.");
        }

        var marks = request.Marks ?? question.Marks;
        if (marks <= 0)
        {
            throw new ValidationAppException(["Marks must be greater than zero."]);
        }

        var existingQuestions = await _quizQuestions.GetQuizQuestionsAsync(
            quizId,
            cancellationToken,
            includeInactive: true);
        var displayOrder = (short)(existingQuestions.Count + 1);
        await _quizQuestions.AddQuizQuestionAsync(
            new QuizQuestion(quizId, question.Id, displayOrder, marks),
            cancellationToken);
        await _quizQuestions.RecalculateQuizTotalsAsync(quizId, cancellationToken);
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

        var link = await _quizQuestions.GetQuizQuestionLinkAsync(quizId, questionId, cancellationToken)
            ?? throw new NotFoundAppException("Question was not found on this quiz.");

        var question = await _questions.GetQuestionEntityForManageAsync(questionId, cancellationToken)
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

        await ReplaceOptionsAsync(questionId, request.Options, cancellationToken);
        link.SetMarks(request.Marks);
        await _quizQuestions.RecalculateQuizTotalsAsync(quizId, cancellationToken);
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

        var link = await _quizQuestions.GetQuizQuestionLinkAsync(quizId, questionId, cancellationToken)
            ?? throw new NotFoundAppException("Question was not found on this quiz.");

        await _quizQuestions.RemoveQuizQuestionLinkAsync(link, cancellationToken);

        var question = await _questions.GetQuestionEntityForManageAsync(questionId, cancellationToken);
        if (question is not null &&
            string.Equals(question.CreatedBy, scope.UserId.ToString(), StringComparison.Ordinal))
        {
            question.Deactivate();
        }

        await _quizQuestions.RecalculateQuizTotalsAsync(quizId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await BuildManageResponseAsync(quizId, scope, cancellationToken);
    }

    private async Task ReplaceOptionsAsync(
        long questionId,
        IReadOnlyList<QuizQuestionOptionRequest> options,
        CancellationToken cancellationToken)
    {
        await _questions.RemoveQuestionOptionsAsync(questionId, cancellationToken);
        if (options.Count == 0)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return;
        }

        var entities = options
            .Select(option => new QuestionOption(questionId, option.OptionText, option.IsCorrect))
            .ToArray();
        await _questions.AddQuestionOptionsAsync(entities, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<ManageQuizResponse> BuildManageResponseAsync(
        long quizId,
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        var detail = await _quizzes.GetDetailForCreatorAsync(quizId, scope.UserId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");

        var questions = await _quizQuestions.GetQuizQuestionsAsync(quizId, cancellationToken, includeInactive: true);
        return QuizManageMapping.ToManageResponse(detail, questions);
    }
}
