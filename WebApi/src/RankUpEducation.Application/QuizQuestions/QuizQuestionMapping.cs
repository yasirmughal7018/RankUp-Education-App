using RankUpEducation.Application.Quizzes;
using RankUpEducation.Contracts.QuizQuestions;

namespace RankUpEducation.Application.QuizQuestions;

internal static class QuizQuestionMapping
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
