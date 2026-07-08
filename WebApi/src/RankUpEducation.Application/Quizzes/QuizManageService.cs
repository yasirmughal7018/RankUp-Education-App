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

    Task<DuplicateQuizResponse> DuplicateAsync(long quizId, CancellationToken cancellationToken);

    Task<ArchiveQuizResponse> ArchiveAsync(long quizId, CancellationToken cancellationToken);

    Task<ApproveQuizResponse> ApproveAsync(long quizId, CancellationToken cancellationToken);
}

public sealed class QuizManageService : IQuizManageService
{
    private readonly IQuizRepository _quizzes;
    private readonly IQuizQuestionRepository _quizQuestions;
    private readonly IQuestionRepository _questions;
    private readonly ILookupRepository _lookups;
    private readonly IStudentScopeRepository _studentScope;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly QuizManageGuard _guard;

    public QuizManageService(
        IQuizRepository quizzes,
        IQuizQuestionRepository quizQuestions,
        IQuestionRepository questions,
        ILookupRepository lookups,
        IStudentScopeRepository studentScope,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser)
    {
        _quizzes = quizzes;
        _quizQuestions = quizQuestions;
        _questions = questions;
        _lookups = lookups;
        _studentScope = studentScope;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _guard = new QuizManageGuard(quizzes, lookups);
    }

    public async Task<ManageQuizResponse> CreateAsync(CreateQuizRequest request, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        ValidateCreateRequest(request);

        var schoolContext = await ResolveSchoolContextAsync(scope, request.ContextStudentId, cancellationToken);
        var draftStatusId = await _guard.RequireLookupAsync(
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
        var quiz = await _guard.RequireEditableQuizAsync(quizId, scope, cancellationToken);

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
        var quiz = await _guard.RequireOwnedQuizAsync(quizId, scope, cancellationToken);
        await _guard.EnsureDraftOnlyAsync(quiz, cancellationToken);

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
        var quiz = await _guard.RequireEditableQuizAsync(quizId, scope, cancellationToken);

        var publishedStatusId = await _guard.RequireLookupAsync(
            QuizLookupNames.QuizLifecycleStatus,
            QuizLookupNames.PublishedLifecycleNames,
            cancellationToken);

        if (scope.Role == UserRole.Teacher)
        {
            quiz.SubmitForApproval(publishedStatusId);
        }
        else
        {
            var approvedStatusId = await _guard.RequireLookupAsync(
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

        var approvalName = await _lookups.GetLookupNameAsync(quiz.ApprovalStatusId, cancellationToken);
        if (approvalName.Equals("Approved", StringComparison.OrdinalIgnoreCase))
        {
            throw new BusinessRuleException("Quiz is already approved.");
        }

        var approvedStatusId = await _guard.RequireLookupAsync(
            QuizLookupNames.QuizApprovalStatus,
            QuizLookupNames.ApprovedStatusNames,
            cancellationToken);

        quiz.Approve(approvedStatusId, scope.UserId.ToString());
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        return new ApproveQuizResponse(quizId, "Approved", lifecycleName);
    }

    public async Task<ManageQuizResponse> GetManageDetailAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        await _guard.RequireOwnedQuizAsync(quizId, scope, cancellationToken);
        return await BuildManageResponseAsync(quizId, cancellationToken);
    }

    public async Task<DuplicateQuizResponse> DuplicateAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        var source = await _guard.RequireOwnedQuizAsync(quizId, scope, cancellationToken);
        await _guard.EnsureNotArchivedAsync(source, cancellationToken);

        if (source.TotalQuestions <= 0)
        {
            throw new BusinessRuleException("Quiz must contain at least one question to duplicate.");
        }

        var draftStatusId = await _guard.RequireLookupAsync(
            QuizLookupNames.QuizLifecycleStatus,
            QuizLookupNames.DraftLifecycleNames,
            cancellationToken);
        var pendingApprovalId = await _guard.RequireLookupAsync(
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

        var sourceQuestions = await _quizQuestions.GetQuizQuestionsForCopyAsync(quizId, cancellationToken);
        var questionStatusId = await _guard.RequireLookupAsync(
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

            await _questions.AddQuestionAsync(question, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            if (sourceQuestion.Options.Count > 0)
            {
                var options = sourceQuestion.Options
                    .Select(option => new QuestionOption(question.Id, option.OptionText, option.IsCorrect))
                    .ToArray();
                await _questions.AddQuestionOptionsAsync(options, cancellationToken);
            }

            await _quizQuestions.AddQuizQuestionAsync(
                new QuizQuestion(copy.Id, question.Id, sourceQuestion.DisplayOrder, sourceQuestion.Marks),
                cancellationToken);
        }

        await _quizQuestions.RecalculateQuizTotalsAsync(copy.Id, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var duplicated = await BuildManageResponseAsync(copy.Id, cancellationToken);
        return new DuplicateQuizResponse(quizId, duplicated);
    }

    public async Task<ArchiveQuizResponse> ArchiveAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        var quiz = await _guard.RequireOwnedQuizAsync(quizId, scope, cancellationToken);

        var lifecycleName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        if (IsArchivedLifecycle(lifecycleName))
        {
            throw new BusinessRuleException("Quiz is already archived.");
        }

        if (IsDraftLifecycle(lifecycleName))
        {
            throw new BusinessRuleException("Draft quizzes should be deleted instead of archived.");
        }

        var archivedStatusId = await _guard.RequireLookupAsync(
            QuizLookupNames.QuizLifecycleStatus,
            QuizLookupNames.ArchivedLifecycleNames,
            cancellationToken);

        quiz.Archive(archivedStatusId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var archivedName = await _lookups.GetLookupNameAsync(quiz.LifecycleStatusId, cancellationToken);
        return new ArchiveQuizResponse(quizId, archivedName);
    }

    private async Task<ManageQuizResponse> BuildManageResponseAsync(long quizId, CancellationToken cancellationToken)
    {
        var scope = QuizScopeResolver.RequireManageScope(GetCurrentUser());
        var detail = await _quizzes.GetDetailForCreatorAsync(quizId, scope.UserId, cancellationToken)
            ?? throw new NotFoundAppException("Quiz was not found.");

        var questions = await _quizQuestions.GetQuizQuestionsAsync(quizId, cancellationToken, includeInactive: true);
        return QuizManageMapping.ToManageResponse(detail, questions);
    }

    private async Task<StudentSchoolContext> ResolveSchoolContextAsync(
        QuizManageScope scope,
        long? contextStudentId,
        CancellationToken cancellationToken)
    {
        if (scope.Role == UserRole.Parent)
        {
            var linkedStudentIds = await _studentScope.GetLinkedStudentIdsAsync(scope.ParentId, cancellationToken);
            if (linkedStudentIds.Count == 0)
            {
                throw new BusinessRuleException("Link at least one child before creating a quiz.");
            }

            var studentId = contextStudentId ?? linkedStudentIds[0];
            if (!linkedStudentIds.Contains(studentId))
            {
                throw new ForbiddenAppException("Selected child is not linked to this parent account.");
            }

            var context = await _studentScope.GetStudentSchoolContextAsync(studentId, cancellationToken)
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
            return await _guard.RequireLookupAsync(
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

        return await _guard.RequireLookupAsync(
            QuizLookupNames.QuizType,
            QuizLookupNames.SchoolQuizTypeNames,
            cancellationToken);
    }

    private async Task<short> ResolveInitialApprovalStatusIdAsync(
        QuizManageScope scope,
        CancellationToken cancellationToken)
    {
        return await _guard.RequireLookupAsync(
            QuizLookupNames.QuizApprovalStatus,
            QuizLookupNames.PendingApprovalStatusNames,
            cancellationToken);
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

    private static bool IsDraftLifecycle(string lifecycleName)
        => lifecycleName.Equals("Draft", StringComparison.OrdinalIgnoreCase);

    private static bool IsArchivedLifecycle(string lifecycleName)
        => lifecycleName.Equals("Archived", StringComparison.OrdinalIgnoreCase);

    private ICurrentUserService GetCurrentUser() => _currentUser;
}
