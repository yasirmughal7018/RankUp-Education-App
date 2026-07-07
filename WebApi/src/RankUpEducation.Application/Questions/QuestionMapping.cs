using RankUpEducation.Application.Quizzes;
using RankUpEducation.Contracts.Questions;

namespace RankUpEducation.Application.Questions;

internal static class QuestionMapping
{
    public static QuizQuestionListResponse ToListResponse(long quizId, IReadOnlyList<QuizQuestionItem> questions)
        => new(quizId, questions.Select(ToQuestionResponse).ToArray());

    public static ManageQuizQuestionResponse ToQuestionResponse(QuizQuestionItem question)
        => new(
            question.QuestionId,
            question.QuestionText,
            question.QuestionTypeName,
            question.Marks,
            question.DisplayOrder,
            question.Hint,
            question.Options.Select(option => new QuizQuestionOptionResponse(
                option.OptionId,
                option.OptionText,
                option.IsCorrect)).ToArray());
}
