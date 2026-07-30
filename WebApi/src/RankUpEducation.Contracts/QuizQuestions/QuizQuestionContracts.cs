namespace RankUpEducation.Contracts.QuizQuestions;

using RankUpEducation.Contracts.Questions;

public sealed record QuizQuestionOptionRequest(
    string OptionText,
    bool IsCorrect,
    string? OptionImageUrl = null);

/// <summary>Creates an inline question on a quiz (not sourced from the shared bank).</summary>
public sealed record AddQuizQuestionRequest(
    string QuestionText,
    string QuestionType,
    short Marks,
    short EstimatedTimeSeconds,
    string? Hint,
    string? Explanation,
    IReadOnlyList<QuizQuestionOptionRequest> Options,
    IReadOnlyList<QuestionAcceptedAnswerRequest>? AcceptedAnswers = null);

/// <summary>Links an approved bank question; optional marks override defaults to bank marks.</summary>
public sealed record AttachBankQuestionRequest(
    long QuestionId,
    short? Marks = null);

/// <summary>Updates inline question content on a quiz.</summary>
public sealed record UpdateQuizQuestionRequest(
    string QuestionText,
    string QuestionType,
    short Marks,
    short EstimatedTimeSeconds,
    string? Hint,
    string? Explanation,
    IReadOnlyList<QuizQuestionOptionRequest> Options,
    IReadOnlyList<QuestionAcceptedAnswerRequest>? AcceptedAnswers = null);

public sealed record QuizQuestionOptionResponse(
    long OptionId,
    string OptionText,
    bool IsCorrect,
    string? OptionImageUrl = null);

/// <summary>Question on a quiz manage view.</summary>
public sealed record ManageQuizQuestionResponse(
    long QuestionId,
    string QuestionText,
    string QuestionType,
    short Marks,
    short DisplayOrder,
    string? Hint,
    short EstimatedTimeSeconds,
    IReadOnlyList<QuizQuestionOptionResponse> Options,
    IReadOnlyList<QuestionAcceptedAnswerResponse>? AcceptedAnswers = null);

public sealed record QuizQuestionListResponse(
    long QuizId,
    IReadOnlyList<ManageQuizQuestionResponse> Items);
