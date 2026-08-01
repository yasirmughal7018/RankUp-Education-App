using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Application.Questions;
using RankUpEducation.Application.Quizzes;
using RankUpEducation.Contracts.Questions;
using RankUpEducation.Contracts.QuizQuestions;
using RankUpEducation.Contracts.Quizzes;
using RankUpEducation.Domain.Approvals;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Questions;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.QuizQuestions;

/// <summary>
/// Manages questions on a quiz: inline create, bank attach, update, and remove with total recalculation.
/// </summary>
public interface IQuizQuestionService
{
    /// <summary>Lists questions on a quiz including inactive links (manage view).</summary>
    Task<QuizQuestionListResponse> ListForQuizAsync(long quizId, CancellationToken cancellationToken);

    /// <summary>Creates a campus-scoped approved question and links it to the quiz.</summary>
    Task<ManageQuizResponse> AddToQuizAsync(
        long quizId,
        AddQuizQuestionRequest request,
        CancellationToken cancellationToken);

    /// <summary>
    /// Attaches an existing Approved + active bank question that is visible in the caller's
    /// org scope (Public / School / Campus) and matches quiz class/subject.
    /// </summary>
    Task<ManageQuizResponse> AttachBankQuestionAsync(
        long quizId,
        AttachBankQuestionRequest request,
        CancellationToken cancellationToken);

    /// <summary>Updates an inline question owned by the caller; bank-only links cannot edit source text.</summary>
    Task<ManageQuizResponse> UpdateOnQuizAsync(
        long quizId,
        long questionId,
        UpdateQuizQuestionRequest request,
        CancellationToken cancellationToken);

    /// <summary>Removes the quiz link and deactivates inline questions created by the caller.</summary>
    Task<ManageQuizResponse> RemoveFromQuizAsync(
        long quizId,
        long questionId,
        CancellationToken cancellationToken);
}

/// <inheritdoc cref="IQuizQuestionService"/>
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
            scope.UserId,
            scope.Role,
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

        // Inline quiz questions are created ready for use within the quiz campus.
        question.SetOrgScope(quiz.SchoolId, quiz.SchoolCampusId);
        question.MarkFullyApproved(
            scope.UserId,
            questionStatusId,
            QuestionVisibilityLevels.Campus);

        await _questions.AddQuestionAsync(question, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (question.Id <= 0)
        {
            throw new InvalidOperationException(
                "Question was inserted but no database identity was returned.");
        }

        // Trail: inline quiz questions are created + campus-endorsed in one step.
        var trailNow = DateTimeOffset.UtcNow;
        await _questions.AddApprovalEventAsync(
            Approval.RecordQuestionEvent(
                question.Id, scope.UserId, scope.Role, ApprovalAction.Created, trailNow),
            cancellationToken);
        await _questions.AddApprovalEventAsync(
            Approval.RecordQuestionEvent(
                question.Id, scope.UserId, scope.Role, ApprovalAction.Endorsed, trailNow),
            cancellationToken);

        _questions.DetachQuestion(question);
        await ReplaceAnswersAsync(
            question.Id,
            request.QuestionType,
            request.Options,
            request.AcceptedAnswers,
            cancellationToken);

        var existingQuestions = await _quizQuestions.GetQuizQuestionsAsync(quizId, cancellationToken, includeInactive: true);
        var displayOrder = (short)(existingQuestions.Count + 1);
        await _quizQuestions.AddQuizQuestionAsync(
            new QuizQuestion(quizId, question.Id, displayOrder, request.Marks, quiz.ShuffleOptions),
            cancellationToken);
        await _quizQuestions.RecalculateQuizTotalsAsync(quizId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await BuildManageResponseAsync(quizId, cancellationToken);
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
        var isApprovedStatus =
            QuizLookupNames.IsApprovedQuestionStatusId(question.StatusId)
            || QuizLookupNames.IsApprovedQuestionStatusName(statusName);
        if (!isApprovedStatus)
        {
            throw new BusinessRuleException("Only approved question-bank items can be attached to a quiz.");
        }

        if (!question.IsEligibleForQuiz)
        {
            throw new BusinessRuleException(
                "Question must be published by Portal Admin (Public + Active) before it can be added to a quiz.");
        }

        // Bank attach: only Public questions are visible/usable for quiz selection.
        var questionScope = QuestionScopeResolver.RequireManageScope(_currentUser);
        if (!QuestionScopeResolver.CanViewQuestion(
                question.CreatedBy,
                question.CreatedByRole,
                question.VisibilityLevel,
                question.SchoolId,
                question.CampusId,
                questionScope))
        {
            throw new ForbiddenAppException(
                "This question is outside your visibility scope and cannot be attached to the quiz.");
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
            new QuizQuestion(quizId, question.Id, displayOrder, marks, quiz.ShuffleOptions),
            cancellationToken);
        await _quizQuestions.RecalculateQuizTotalsAsync(quizId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await BuildManageResponseAsync(quizId, cancellationToken);
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

        if (question.CreatedBy != scope.UserId)
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

        await ReplaceAnswersAsync(
            questionId,
            request.QuestionType,
            request.Options,
            request.AcceptedAnswers,
            cancellationToken);
        link.SetMarks(request.Marks);
        await _quizQuestions.RecalculateQuizTotalsAsync(quizId, cancellationToken);
        await _questions.AddApprovalEventAsync(
            Approval.RecordQuestionEvent(
                questionId,
                scope.UserId,
                scope.Role,
                ApprovalAction.Modified,
                DateTimeOffset.UtcNow),
            cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await BuildManageResponseAsync(quizId, cancellationToken);
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
            question.CreatedBy == scope.UserId)
        {
            question.Deactivate();
        }

        await _quizQuestions.RecalculateQuizTotalsAsync(quizId, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await BuildManageResponseAsync(quizId, cancellationToken);
    }

    private async Task ReplaceAnswersAsync(
        long questionId,
        string questionType,
        IReadOnlyList<QuizQuestionOptionRequest> options,
        IReadOnlyList<QuestionAcceptedAnswerRequest>? acceptedAnswers,
        CancellationToken cancellationToken)
    {
        await _questions.RemoveQuestionOptionsAsync(questionId, cancellationToken);
        await _questions.RemoveQuestionAcceptedAnswersAsync(questionId, cancellationToken);

        if (QuizQuestionHelper.IsFillBlankType(questionType))
        {
            var fromAccepted = (acceptedAnswers ?? Array.Empty<QuestionAcceptedAnswerRequest>())
                .Where(answer => !string.IsNullOrWhiteSpace(answer.AnswerText))
                .Select(answer => new QuestionAcceptedAnswer(
                    questionId,
                    answer.AnswerText.Trim(),
                    answer.IsCaseSensitive,
                    answer.AllowPartialMatch,
                    answer.MinimumLength,
                    answer.MaximumLength,
                    answer.AllowAiReview,
                    answer.AllowTeacherReview))
                .ToArray();

            // Legacy: Fill answers sent as options (flags default off).
            var answers = fromAccepted.Length > 0
                ? fromAccepted
                : options
                    .Where(option => !string.IsNullOrWhiteSpace(option.OptionText))
                    .Select(option => new QuestionAcceptedAnswer(questionId, option.OptionText.Trim()))
                    .ToArray();

            if (answers.Length > 0)
            {
                await _questions.AddQuestionAcceptedAnswersAsync(answers, cancellationToken);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return;
        }

        if (options.Count == 0)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            return;
        }

        var entities = options
            .Select(option => new QuestionOption(
                questionId,
                option.OptionText,
                option.IsCorrect,
                option.OptionImageUrl))
            .ToArray();
        await _questions.AddQuestionOptionsAsync(entities, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<ManageQuizResponse> BuildManageResponseAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        // Same as QuizManageService: load by id after ownership was already enforced.
        // Do not filter by creator — PortalAdmin/SchoolAdmin may manage quizzes they did not create.
        var detail = await _quizzes.GetDetailForManageAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");

        var questions = await _quizQuestions.GetQuizQuestionsAsync(quizId, cancellationToken, includeInactive: true);
        return QuizManageMapping.ToManageResponse(detail, questions);
    }
}
