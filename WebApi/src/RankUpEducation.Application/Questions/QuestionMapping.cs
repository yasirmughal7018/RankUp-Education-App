using RankUpEducation.Application.Quizzes;

using RankUpEducation.Contracts.Questions;

using RankUpEducation.Domain.Questions;



namespace RankUpEducation.Application.Questions;



/// <summary>Maps repository read models to question-bank API contracts.</summary>

internal static class QuestionMapping

{

    /// <summary>Maps a list projection to <see cref="QuestionSummaryResponse"/> (visibility as display name).</summary>

    public static QuestionSummaryResponse ToSummaryResponse(QuestionListItem item)

        => new(

            item.QuestionId,

            item.QuestionText,

            item.QuestionTypeName,

            item.StatusName,

            item.ClassId,

            item.SubjectId,

            item.DifficultyLevel,

            item.Marks,

            item.IsActive,

            item.CreatedBy,

            item.ApprovedBy,

            item.IsAiApproved,

            item.SchoolId,

            item.CampusId,

            item.Visibility,

            item.CreatedDate,

            item.ModifiedDate);



    /// <summary>Maps a detail projection to <see cref="QuestionDetailResponse"/> including options / answers.</summary>

    public static QuestionDetailResponse ToDetailResponse(QuestionDetailItem item)

        => new(

            item.QuestionId,

            item.QuestionText,

            item.QuestionTypeName,

            item.ClassId,

            item.SubjectId,

            item.TopicId,

            item.DifficultyLevel,

            item.StatusName,

            item.Marks,

            item.EstimatedTimeSeconds,

            item.Hint,

            item.Explanation,

            item.IsActive,

            item.CreatedBy,

            item.ApprovedBy,

            item.IsAiApproved,

            item.RejectionReason,

            item.SchoolId,

            item.CampusId,

            item.Visibility,

            item.CreatedDate,

            item.ModifiedDate,

            item.Options.Select(option => new QuestionOptionResponse(

                option.OptionId,

                option.OptionText,

                option.IsCorrect)).ToArray(),

            item.AcceptedAnswers.Select(answer => new QuestionAcceptedAnswerResponse(

                answer.AcceptedAnswerId,

                answer.AnswerText,

                answer.IsCaseSensitive,

                answer.AllowPartialMatch,

                answer.MinimumLength,

                answer.MaximumLength,

                answer.AllowAiReview,

                answer.AllowTeacherReview)).ToArray());



    /// <summary>Converts stored visibility short to API name (None | Campus | School | Public).</summary>

    public static string VisibilityName(short level)

        => QuestionVisibilityLevels.ToName(level);

}

