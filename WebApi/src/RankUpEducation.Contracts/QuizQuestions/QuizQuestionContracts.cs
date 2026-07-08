namespace RankUpEducation.Contracts.QuizQuestions;

public sealed record QuizQuestionOptionRequest(
    string OptionText,
    bool IsCorrect);

public sealed record AddQuizQuestionRequest(
    string QuestionText,
    string QuestionType,
    short Marks,
    short EstimatedTimeSeconds,
    string? Hint,
    string? Explanation,
    IReadOnlyList<QuizQuestionOptionRequest> Options);

public sealed record AttachBankQuestionRequest(
    long QuestionId,
    short? Marks = null);

public sealed record UpdateQuizQuestionRequest(
    string QuestionText,
    string QuestionType,
    short Marks,
    short EstimatedTimeSeconds,
    string? Hint,
    string? Explanation,
    IReadOnlyList<QuizQuestionOptionRequest> Options);

public sealed record QuizQuestionOptionResponse(
    long OptionId,
    string OptionText,
    bool IsCorrect);

public sealed record ManageQuizQuestionResponse(
    long QuestionId,
    string QuestionText,
    string QuestionType,
    short Marks,
    short DisplayOrder,
    string? Hint,
    IReadOnlyList<QuizQuestionOptionResponse> Options);

public sealed record QuizQuestionListResponse(
    long QuizId,
    IReadOnlyList<ManageQuizQuestionResponse> Items);
