using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Common.Exceptions;
using RankUpEducation.Contracts.Quizzes;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Questions;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Application.Quizzes;

public interface IQuizManageService
{
    Task<ManageQuizResponse> CreateAsync(CreateQuizRequest request, CancellationToken cancellationToken);

    Task<ManageQuizResponse> UpdateAsync(long quizId, UpdateQuizRequest request, CancellationToken cancellationToken);

    Task DeleteAsync(long quizId, CancellationToken cancellationToken);

    Task<ManageQuizResponse> PublishAsync(long quizId, CancellationToken cancellationToken);

    Task<ManageQuizResponse> GetManageDetailAsync(long quizId, CancellationToken cancellationToken);

    Task<ManageQuizResponse> AddQuestionAsync(
        long quizId,
        AddQuizQuestionRequest request,
        CancellationToken cancellationToken);

    Task<ManageQuizResponse> UpdateQuestionAsync(
        long quizId,
        long questionId,
        UpdateQuizQuestionRequest request,
        CancellationToken cancellationToken);

    Task<ManageQuizResponse> RemoveQuestionAsync(
        long quizId,
        long questionId,
        CancellationToken cancellationToken);

    Task<DuplicateQuizResponse> DuplicateAsync(long quizId, CancellationToken cancellationToken);

    Task<ArchiveQuizResponse> ArchiveAsync(long quizId, CancellationToken cancellationToken);

    Task<ApproveQuizResponse> ApproveAsync(long quizId, CancellationToken cancellationToken);
}

public sealed class QuizManageService : IQuizManageService
{
    private readonly IQuizRepository _quizzes;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;

    public QuizManageService(
        IQuizRepository quizzes,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser)
    {
        _quizzes = quizzes;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
    }

    public async Task<ManageQuizResponse> CreateAsync(CreateQuizRequest request, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        ValidateCreateRequest(request);

        var schoolContext = await ResolveSchoolContextAsync(scope, request.ContextStudentId, cancellationToken);
        var draftStatusId = await RequireLookupAsync(
            QuizLookupNames.QuizLifecycleStatus,
            QuizLookupNames.DraftLifecycleNames,
            cancellationToken);
        var quizTypeId = await ResolveQuizTypeIdForCreateAsync(scope, request.QuizTypeId, cancellationToken);
        var approvalStatusId = await ResolveInitialApprovalStatusIdAsync(scope, cancellationToken);

        var quiz = new Quiz(
            schoolContext.SchoolId,
            schoolContext.CampusId,
            request.Title,
            request.Description,
            quizTypeId,
            request.ClassId,
            request.SubjectId,
            request.TopicId,
            request.DifficultyLevelId,
            0,
            request.Instructions,
            scope.UserId.ToString(),
            approvalStatusId,
            draftStatusId);

        quiz.UpdateDetails(
            request.Title,
            request.Description,
            request.ClassId,
            request.SubjectId,
            request.TopicId,
            request.DifficultyLevelId,
            request.Instructions,
            request.TimeLimitMinutes,
            request.AllowedAttempts,
            request.ShuffleQuestions,
            request.ShuffleOptions,
            request.IsReviewRequired);

        await _quizzes.AddQuizAsync(quiz, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await BuildManageResponseAsync(quiz.Id, cancellationToken);
    }

    public async Task<ManageQuizResponse> UpdateAsync(
        long quizId,
        UpdateQuizRequest request,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        var quiz = await RequireEditableQuizAsync(quizId, scope, cancellationToken);

        quiz.UpdateDetails(
            request.Title,
            request.Description,
            request.ClassId,
            request.SubjectId,
            request.TopicId,
            request.DifficultyLevelId,
            request.Instructions,
            request.TimeLimitMinutes,
            request.AllowedAttempts,
            request.ShuffleQuestions,
            request.ShuffleOptions,
            request.IsReviewRequired);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await BuildManageResponseAsync(quizId, cancellationToken);
    }

    public async Task DeleteAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        var quiz = await RequireOwnedQuizAsync(quizId, scope, cancellationToken);
        await EnsureDraftOnlyAsync(quiz, cancellationToken);

        if (await _quizzes.HasAnyAssignmentsAsync(quizId, cancellationToken))
        {
            throw new BusinessRuleException("Quiz cannot be deleted after assignments exist.");
        }

        quiz.MarkDeleted(DateTimeOffset.UtcNow, scope.UserId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<ManageQuizResponse> PublishAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        var quiz = await RequireOwnedQuizAsync(quizId, scope, cancellationToken);
        await EnsureEditableLifecycleAsync(quiz, cancellationToken);

        var publishedStatusId = await RequireLookupAsync(
            QuizLookupNames.QuizLifecycleStatus,
            QuizLookupNames.PublishedLifecycleNames,
            cancellationToken);

        if (scope.Role == UserRole.Teacher)
        {
            quiz.SubmitForApproval(publishedStatusId);
        }
        else
        {
            var approvedStatusId = await RequireLookupAsync(
                QuizLookupNames.QuizApprovalStatus,
                QuizLookupNames.ApprovedStatusNames,
                cancellationToken);
            quiz.Publish(publishedStatusId, approvedStatusId, scope.UserId.ToString());
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return await BuildManageResponseAsync(quizId, cancellationToken);
    }

    public async Task<ApproveQuizResponse> ApproveAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireApprovalScope(GetCurrentUser());
        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");

        if (scope.Role == UserRole.SchoolAdmin)
        {
            if (quiz.SchoolId != scope.SchoolId)
            {
                throw new ForbiddenAppException("You can only approve quizzes in your school.");
            }
        }

        if (await _quizzes.IsParentPrivateQuizTypeAsync(quiz.QuizTypeId, cancellationToken))
        {
            throw new BusinessRuleException("Parent private quizzes do not require school approval.");
        }

        var approvalName = await _quizzes.GetLookupNameAsync(quiz.ApprovalStatusId, cancellationToken);
        if (approvalName.Equals("Approved", StringComparison.OrdinalIgnoreCase))
        {
            throw new BusinessRuleException("Quiz is already approved.");
        }

        var approvedStatusId = await RequireLookupAsync(
            QuizLookupNames.QuizApprovalStatus,
            QuizLookupNames.ApprovedStatusNames,
            cancellationToken);

        quiz.Approve(approvedStatusId, scope.UserId.ToString());
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var lifecycleName = await _quizzes.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        return new ApproveQuizResponse(quizId, "Approved", lifecycleName);
    }

    public async Task<ManageQuizResponse> GetManageDetailAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        await RequireOwnedQuizAsync(quizId, scope, cancellationToken);
        return await BuildManageResponseAsync(quizId, cancellationToken);
    }

    public async Task<ManageQuizResponse> AddQuestionAsync(
        long quizId,
        AddQuizQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        var quiz = await RequireEditableQuizAsync(quizId, scope, cancellationToken);
        ValidateQuestionRequest(request);

        var questionTypeId = await ResolveQuestionTypeIdAsync(request.QuestionType, cancellationToken);
        var questionStatusId = await RequireLookupAsync(
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

        return await BuildManageResponseAsync(quizId, cancellationToken);
    }

    public async Task<ManageQuizResponse> UpdateQuestionAsync(
        long quizId,
        long questionId,
        UpdateQuizQuestionRequest request,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        await RequireEditableQuizAsync(quizId, scope, cancellationToken);
        ValidateQuestionRequest(request);

        var link = await _quizzes.GetQuizQuestionLinkAsync(quizId, questionId, cancellationToken)
            ?? throw new NotFoundAppException("Question was not found on this quiz.");

        var question = await _quizzes.GetQuestionEntityAsync(questionId, cancellationToken)
            ?? throw new NotFoundAppException("Question was not found.");

        if (!string.Equals(question.CreatedBy, scope.UserId.ToString(), StringComparison.Ordinal))
        {
            throw new ForbiddenAppException("You can only edit questions you created.");
        }

        var questionTypeId = await ResolveQuestionTypeIdAsync(request.QuestionType, cancellationToken);
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

        return await BuildManageResponseAsync(quizId, cancellationToken);
    }

    public async Task<ManageQuizResponse> RemoveQuestionAsync(
        long quizId,
        long questionId,
        CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        await RequireEditableQuizAsync(quizId, scope, cancellationToken);

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

        return await BuildManageResponseAsync(quizId, cancellationToken);
    }

    public async Task<DuplicateQuizResponse> DuplicateAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        var source = await RequireOwnedQuizAsync(quizId, scope, cancellationToken);
        await EnsureNotArchivedAsync(source, cancellationToken);

        if (source.TotalQuestions <= 0)
        {
            throw new BusinessRuleException("Quiz must contain at least one question to duplicate.");
        }

        var draftStatusId = await RequireLookupAsync(
            QuizLookupNames.QuizLifecycleStatus,
            QuizLookupNames.DraftLifecycleNames,
            cancellationToken);
        var pendingApprovalId = await RequireLookupAsync(
            QuizLookupNames.QuizApprovalStatus,
            ["Pending", "Draft"],
            cancellationToken);

        var copyTitle = source.QuizTitle.Length > 92
            ? $"{source.QuizTitle[..92]} (Copy)"
            : $"{source.QuizTitle} (Copy)";

        var copy = new Quiz(
            source.SchoolId,
            source.SchoolCampusId,
            copyTitle,
            source.Description,
            source.QuizTypeId,
            source.ClassId,
            source.SubjectId,
            source.TopicId,
            source.DifficultyLevelId,
            0,
            source.Instructions,
            scope.UserId.ToString(),
            pendingApprovalId,
            draftStatusId);

        copy.UpdateDetails(
            copyTitle,
            source.Description,
            source.ClassId,
            source.SubjectId,
            source.TopicId,
            source.DifficultyLevelId,
            source.Instructions,
            source.TimeLimitMinutes,
            source.AllowedAttempts,
            source.ShuffleQuestions,
            source.ShuffleOptions,
            source.IsReviewRequired);

        await _quizzes.AddQuizAsync(copy, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var sourceQuestions = await _quizzes.GetQuizQuestionsForCopyAsync(quizId, cancellationToken);
        var questionStatusId = await RequireLookupAsync(
            QuizLookupNames.QuestionStatus,
            QuizLookupNames.ActiveQuestionStatusNames,
            cancellationToken);

        foreach (var sourceQuestion in sourceQuestions)
        {
            var question = new Question(
                sourceQuestion.QuestionText,
                sourceQuestion.QuestionTypeId,
                sourceQuestion.ClassId,
                sourceQuestion.SubjectId,
                sourceQuestion.TopicId,
                sourceQuestion.DifficultyLevel,
                questionStatusId,
                scope.UserId.ToString(),
                sourceQuestion.EstimatedTimeSeconds,
                sourceQuestion.Marks);

            question.UpdateDetails(
                sourceQuestion.QuestionText,
                sourceQuestion.QuestionTypeId,
                sourceQuestion.ClassId,
                sourceQuestion.SubjectId,
                sourceQuestion.TopicId,
                sourceQuestion.DifficultyLevel,
                sourceQuestion.EstimatedTimeSeconds,
                sourceQuestion.Marks,
                sourceQuestion.Hint,
                sourceQuestion.Explanation);

            await _quizzes.AddQuestionAsync(question, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            if (sourceQuestion.Options.Count > 0)
            {
                var options = sourceQuestion.Options
                    .Select(option => new QuestionOption(question.Id, option.OptionText, option.IsCorrect))
                    .ToArray();
                await _quizzes.AddQuestionOptionsAsync(options, cancellationToken);
            }

            await _quizzes.AddQuizQuestionAsync(
                new QuizQuestion(copy.Id, question.Id, sourceQuestion.DisplayOrder, sourceQuestion.Marks),
                cancellationToken);
        }

        await _quizzes.RecalculateQuizTotalsAsync(copy.Id, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var duplicated = await BuildManageResponseAsync(copy.Id, cancellationToken);
        return new DuplicateQuizResponse(quizId, duplicated);
    }

    public async Task<ArchiveQuizResponse> ArchiveAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        var quiz = await RequireOwnedQuizAsync(quizId, scope, cancellationToken);

        var lifecycleName = await _quizzes.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        if (IsArchivedLifecycle(lifecycleName))
        {
            throw new BusinessRuleException("Quiz is already archived.");
        }

        if (IsDraftLifecycle(lifecycleName))
        {
            throw new BusinessRuleException("Draft quizzes should be deleted instead of archived.");
        }

        var archivedStatusId = await RequireLookupAsync(
            QuizLookupNames.QuizLifecycleStatus,
            QuizLookupNames.ArchivedLifecycleNames,
            cancellationToken);

        quiz.Archive(archivedStatusId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var archivedName = await _quizzes.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        return new ArchiveQuizResponse(quizId, archivedName);
    }

    private async Task<ManageQuizResponse> BuildManageResponseAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        var detail = await _quizzes.GetDetailForCreatorAsync(quizId, scope.UserId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");

        var questions = await _quizzes.GetQuizQuestionsAsync(quizId, cancellationToken);
        return QuizManageMapping.ToManageResponse(detail, questions);
    }

    private async Task<Quiz> RequireOwnedQuizAsync(
        long quizId,
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        var quiz = await _quizzes.GetQuizEntityAsync(quizId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");

        QuizScopeResolver.EnsureOwnsQuiz(quiz, scope);
        return quiz;
    }

    private async Task<Quiz> RequireEditableQuizAsync(
        long quizId,
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        var quiz = await RequireOwnedQuizAsync(quizId, scope, cancellationToken);
        await EnsureEditableLifecycleAsync(quiz, cancellationToken);
        return quiz;
    }

    private async Task EnsureEditableLifecycleAsync(Quiz quiz, CancellationToken cancellationToken)
    {
        var lifecycleName = await _quizzes.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
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

    private async Task EnsureNotArchivedAsync(Quiz quiz, CancellationToken cancellationToken)
    {
        var lifecycleName = await _quizzes.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        if (IsArchivedLifecycle(lifecycleName))
        {
            throw new BusinessRuleException("Archived quizzes are read-only.");
        }
    }

    private async Task EnsureDraftOnlyAsync(Quiz quiz, CancellationToken cancellationToken)
    {
        var lifecycleName = await _quizzes.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        if (!IsDraftLifecycle(lifecycleName))
        {
            throw new BusinessRuleException("Only draft quizzes can be deleted.");
        }
    }

    private static bool IsEditableLifecycle(string lifecycleName)
        => IsDraftLifecycle(lifecycleName) || lifecycleName.Equals("Published", StringComparison.OrdinalIgnoreCase);

    private static bool IsDraftLifecycle(string lifecycleName)
        => lifecycleName.Equals("Draft", StringComparison.OrdinalIgnoreCase);

    private static bool IsArchivedLifecycle(string lifecycleName)
        => lifecycleName.Equals("Archived", StringComparison.OrdinalIgnoreCase);

    private async Task<StudentSchoolContext> ResolveSchoolContextAsync(
        QuizManageScope scope,
        long? contextStudentId,
        CancellationToken cancellationToken)
    {
        if (scope.Role == UserRole.Parent)
        {
            var linkedStudentIds = await _quizzes.GetLinkedStudentIdsAsync(scope.ParentId, cancellationToken);
            if (linkedStudentIds.Count == 0)
            {
                throw new BusinessRuleException("Link at least one child before creating a quiz.");
            }

            var studentId = contextStudentId ?? linkedStudentIds[0];
            if (!linkedStudentIds.Contains(studentId))
            {
                throw new ForbiddenAppException("Selected child is not linked to this parent account.");
            }

            var context = await _quizzes.GetStudentSchoolContextAsync(studentId, cancellationToken)
                ?? throw new BusinessRuleException("Student school context was not found.");

            return context;
        }

        if (scope.Role == UserRole.Teacher)
        {
            var schoolId = scope.SchoolId ?? throw new ForbiddenAppException("Teacher school context was not found.");
            var campusId = scope.CampusId ?? throw new ForbiddenAppException("Teacher campus context was not found.");

            return new StudentSchoolContext(schoolId, campusId, 0);
        }

        throw new ForbiddenAppException("School context is not available for this role yet.");
    }

    private async Task<short> ResolveQuizTypeIdForCreateAsync(
        QuizManageScope scope,
        short? requestedQuizTypeId,
        CancellationToken cancellationToken)
    {
        if (scope.Role == UserRole.Parent)
        {
            return await RequireLookupAsync(
                QuizLookupNames.QuizType,
                QuizLookupNames.ParentPrivateQuizTypeNames,
                cancellationToken);
        }

        if (requestedQuizTypeId is > 0)
        {
            if (await _quizzes.IsParentPrivateQuizTypeAsync(requestedQuizTypeId.Value, cancellationToken))
            {
                throw new ValidationAppException(["Teachers cannot create parent private quizzes."]);
            }

            return requestedQuizTypeId.Value;
        }

        return await RequireLookupAsync(
            QuizLookupNames.QuizType,
            QuizLookupNames.SchoolQuizTypeNames,
            cancellationToken);
    }

    private async Task<short> ResolveInitialApprovalStatusIdAsync(
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        if (scope.Role == UserRole.Teacher)
        {
            return await RequireLookupAsync(
                QuizLookupNames.QuizApprovalStatus,
                QuizLookupNames.PendingApprovalStatusNames,
                cancellationToken);
        }

        return await RequireLookupAsync(
            QuizLookupNames.QuizApprovalStatus,
            QuizLookupNames.PendingApprovalStatusNames,
            cancellationToken);
    }

    private async Task<short> ResolveQuestionTypeIdAsync(string questionType, CancellationToken cancellationToken)
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

        var directId = await _quizzes.ResolveLookupIdAsync(QuizLookupNames.QuestionType, normalized, 0, cancellationToken);
        if (directId == 0)
        {
            throw new ValidationAppException([$"Question type '{questionType}' is not supported."]);
        }

        return directId;
    }

    private async Task<short> RequireLookupAsync(
        string type,
        IReadOnlyList<string> names,
        CancellationToken cancellationToken)
    {
        var id = await _quizzes.ResolveLookupIdByNamesAsync(type, names, 0, cancellationToken);
        if (id == 0)
        {
            throw new BusinessRuleException($"Required lookup '{type}' ({string.Join(", ", names)}) was not found.");
        }

        return id;
    }

    private static void ValidateCreateRequest(CreateQuizRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            errors.Add("Title is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Instructions))
        {
            errors.Add("Instructions are required.");
        }

        if (errors.Count > 0)
        {
            throw new ValidationAppException(errors);
        }
    }

    private static void ValidateQuestionRequest(AddQuizQuestionRequest request)
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

    private static void ValidateQuestionRequest(UpdateQuizQuestionRequest request)
        => ValidateQuestionRequest(new AddQuizQuestionRequest(
            request.QuestionText,
            request.QuestionType,
            request.Marks,
            request.EstimatedTimeSeconds,
            request.Hint,
            request.Explanation,
            request.Options));

    private ICurrentUserService GetCurrentUser() => _currentUser;
}
