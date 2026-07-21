using RankUpEducation.Contracts.Questions;

namespace RankUpEducation.Application.Questions;

/// <summary>
/// Parsed Excel import row before Class/Subject/Topic/Status lookup resolution.
/// Class / Subject / Topic tokens may be lookup names or numeric IDs.
/// </summary>
public sealed record QuestionExcelImportRow(
    string QuestionText,
    string QuestionType,
    string ClassToken,
    string SubjectToken,
    string? TopicToken,
    short DifficultyLevel,
    short Marks,
    short EstimatedTimeSeconds,
    string? Hint,
    string? Explanation,
    /// <summary>Ignored — imports always create PendingReview.</summary>
    bool? SubmitForReview,
    IReadOnlyList<QuestionOptionRequest> Options,
    IReadOnlyList<QuestionAcceptedAnswerRequest> AcceptedAnswers);
