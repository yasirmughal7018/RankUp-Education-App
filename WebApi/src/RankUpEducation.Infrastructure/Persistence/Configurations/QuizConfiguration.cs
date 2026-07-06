using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Infrastructure.Persistence.Configurations;

public sealed class QuizConfiguration : IEntityTypeConfiguration<Quiz>
{
    public void Configure(EntityTypeBuilder<Quiz> builder)
    {
        builder.ToTable("quizzes");
        builder.HasKey(quiz => quiz.Id);
        builder.Property(quiz => quiz.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(quiz => quiz.SchoolId).HasColumnName("school_id").IsRequired();
        builder.Property(quiz => quiz.SchoolCampusId).HasColumnName("school_campus_id").IsRequired();
        builder.Property(quiz => quiz.QuizTitle).HasColumnName("quiz_title").HasMaxLength(100).IsRequired();
        builder.Property(quiz => quiz.Description).HasColumnName("description").HasMaxLength(500).IsRequired();
        builder.Property(quiz => quiz.QuizTypeId).HasColumnName("quiz_type_id").IsRequired();
        builder.Property(quiz => quiz.ClassId).HasColumnName("class_id").IsRequired();
        builder.Property(quiz => quiz.SubjectId).HasColumnName("subject_id").IsRequired();
        builder.Property(quiz => quiz.TopicId).HasColumnName("topic_id").IsRequired();
        builder.Property(quiz => quiz.DifficultyLevelId).HasColumnName("difficulty_level_id").IsRequired();
        builder.Property(quiz => quiz.TotalQuestions).HasColumnName("total_questions").IsRequired();
        builder.Property(quiz => quiz.TotalMarks).HasColumnName("total_marks");
        builder.Property(quiz => quiz.TimeLimitMinutes).HasColumnName("time_limit_minutes");
        builder.Property(quiz => quiz.AllowedAttempts).HasColumnName("allowed_attempts");
        builder.Property(quiz => quiz.ShuffleQuestions).HasColumnName("shuffle_questions").HasDefaultValue(true);
        builder.Property(quiz => quiz.ShuffleOptions).HasColumnName("shuffle_options").HasDefaultValue(true);
        builder.Property(quiz => quiz.Instructions).HasColumnName("instructions").HasMaxLength(1000).IsRequired();
        builder.Property(quiz => quiz.IsActive).HasColumnName("is_active").HasDefaultValue(true);
        builder.Property(quiz => quiz.CreatedByName).HasColumnName("created_by").HasMaxLength(100).IsRequired();
        builder.Property(quiz => quiz.ApprovedBy).HasColumnName("approved_by").HasMaxLength(100);
        builder.Property(quiz => quiz.ApprovalStatusId).HasColumnName("approval_status_id").IsRequired();
        builder.Property(quiz => quiz.LifecycleStatusId).HasColumnName("lifecycle_status_id").IsRequired();
        builder.Property(quiz => quiz.CreatedDate).HasColumnName("created_date");
        builder.Property(quiz => quiz.ModifiedDate).HasColumnName("modified_date");
        builder.Property(quiz => quiz.IsDeleted).HasColumnName("is_deleted").HasDefaultValue(false);
        builder.Property(quiz => quiz.IsReviewRequired).HasColumnName("is_review_required").HasDefaultValue(true);
        builder.Ignore(quiz => quiz.CreatedAt);
        builder.Ignore(quiz => quiz.CreatedBy);
        builder.Ignore(quiz => quiz.UpdatedAt);
        builder.Ignore(quiz => quiz.UpdatedBy);
        builder.Ignore(quiz => quiz.DeletedAt);
        builder.Ignore(quiz => quiz.DeletedBy);
    }
}

public sealed class QuizAssignmentConfiguration : IEntityTypeConfiguration<QuizAssignment>
{
    public void Configure(EntityTypeBuilder<QuizAssignment> builder)
    {
        builder.ToTable("quiz_assignments");
        builder.HasKey(assignment => assignment.Id);
        builder.Property(assignment => assignment.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(assignment => assignment.QuizId).HasColumnName("quiz_id").IsRequired();
        builder.Property(assignment => assignment.StudentId).HasColumnName("student_id").IsRequired();
        builder.Property(assignment => assignment.AssignedById).HasColumnName("assigned_by_id").IsRequired();
        builder.Property(assignment => assignment.StudentGroupId).HasColumnName("student_group_id");
        builder.Property(assignment => assignment.StartDateTime).HasColumnName("start_date_time").IsRequired();
        builder.Property(assignment => assignment.EndDateTime).HasColumnName("end_date_time").IsRequired();
        builder.Property(assignment => assignment.AllowedAttempts).HasColumnName("allowed_attempts").IsRequired();
        builder.Property(assignment => assignment.QuizResultStatus).HasColumnName("quiz_result_status").IsRequired();
        builder.Property(assignment => assignment.IsReviewDone).HasColumnName("is_review_done").HasDefaultValue(false);
        builder.Property(assignment => assignment.CreatedDate).HasColumnName("created_date");
        builder.Property(assignment => assignment.ModifiedDate).HasColumnName("modified_date");
        builder.HasIndex(assignment => assignment.StudentId).HasDatabaseName("idx_quiz_assignments_student");
    }
}

public sealed class QuizQuestionConfiguration : IEntityTypeConfiguration<QuizQuestion>
{
    public void Configure(EntityTypeBuilder<QuizQuestion> builder)
    {
        builder.ToTable("quiz_questions");
        builder.HasKey(quizQuestion => quizQuestion.Id);
        builder.Property(quizQuestion => quizQuestion.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(quizQuestion => quizQuestion.QuizId).HasColumnName("quiz_id").IsRequired();
        builder.Property(quizQuestion => quizQuestion.QuestionId).HasColumnName("question_id").IsRequired();
        builder.Property(quizQuestion => quizQuestion.DisplayOrder).HasColumnName("display_order").IsRequired();
        builder.Property(quizQuestion => quizQuestion.Marks).HasColumnName("marks").IsRequired();
        builder.Property(quizQuestion => quizQuestion.ShuffleOptions).HasColumnName("shuffle_options").HasDefaultValue(true);
        builder.HasIndex(quizQuestion => new { quizQuestion.QuizId, quizQuestion.QuestionId }).IsUnique();
    }
}

public sealed class QuizReviewConfiguration : IEntityTypeConfiguration<QuizReview>
{
    public void Configure(EntityTypeBuilder<QuizReview> builder)
    {
        builder.ToTable("quiz_reviews", table =>
            table.HasCheckConstraint("chk_review_target_exclusivity", "(quiz_id IS NOT NULL AND question_id IS NULL) OR (question_id IS NOT NULL AND quiz_id IS NULL)"));
        builder.HasKey(review => review.Id);
        builder.Property(review => review.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(review => review.ReviewBy).HasColumnName("review_by").HasMaxLength(50).IsRequired();
        builder.Property(review => review.AiReviewStatus).HasColumnName("ai_review_status");
        builder.Property(review => review.TeacherReviewStatus).HasColumnName("teacher_review_status");
        builder.Property(review => review.ParentReviewStatus).HasColumnName("parent_review_status");
        builder.Property(review => review.AiReviewComment).HasColumnName("ai_review_comment").HasMaxLength(1000);
        builder.Property(review => review.TeacherReviewComment).HasColumnName("teacher_review_comment").HasMaxLength(1000);
        builder.Property(review => review.ParentReviewComment).HasColumnName("parent_review_comment").HasMaxLength(1000);
        builder.Property(review => review.QuizId).HasColumnName("quiz_id");
        builder.Property(review => review.QuestionId).HasColumnName("question_id");
        builder.HasIndex(review => review.QuizId).HasDatabaseName("idx_quiz_reviews_quiz").HasFilter("quiz_id IS NOT NULL");
        builder.HasIndex(review => review.QuestionId).HasDatabaseName("idx_quiz_reviews_question").HasFilter("question_id IS NOT NULL");
    }
}

public sealed class QuizAttemptConfiguration : IEntityTypeConfiguration<QuizAttempt>
{
    public void Configure(EntityTypeBuilder<QuizAttempt> builder)
    {
        builder.ToTable("quiz_attempts");
        builder.HasKey(attempt => attempt.Id);
        builder.Property(attempt => attempt.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(attempt => attempt.QuizId).HasColumnName("quiz_id").IsRequired();
        builder.Property(attempt => attempt.StudentId).HasColumnName("student_id").IsRequired();
        builder.Property(attempt => attempt.NumberOfQuestionAttempt).HasColumnName("number_of_question_attempt").IsRequired();
        builder.Property(attempt => attempt.StatusId).HasColumnName("status_id").IsRequired();
        builder.Property(attempt => attempt.StartedDate).HasColumnName("started_date");
        builder.Property(attempt => attempt.SubmittedDate).HasColumnName("submitted_date");
        builder.Property(attempt => attempt.TimeSpentSeconds).HasColumnName("time_spent_seconds").HasDefaultValue((short)0);
        builder.Property(attempt => attempt.DeviceId).HasColumnName("device_id").HasMaxLength(100).IsRequired();
        builder.Property(attempt => attempt.IsOfflineAttempt).HasColumnName("is_offline_attempt").HasDefaultValue(false);
        builder.Property(attempt => attempt.QuizReviewId).HasColumnName("quiz_review_id");
        builder.Property(attempt => attempt.ObtainedMarks).HasColumnName("obtained_marks").HasDefaultValue((short)0);
        builder.Property(attempt => attempt.Percentage).HasColumnName("percentage").HasDefaultValue((short)0);
        builder.HasIndex(attempt => new { attempt.StudentId, attempt.QuizId }).HasDatabaseName("idx_quiz_attempts_student_quiz");
    }
}

public sealed class QuizAttemptQuestionConfiguration : IEntityTypeConfiguration<QuizAttemptQuestion>
{
    public void Configure(EntityTypeBuilder<QuizAttemptQuestion> builder)
    {
        builder.ToTable("quiz_attempt_questions");
        builder.HasKey(question => question.Id);
        builder.Property(question => question.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(question => question.QuizAttemptId).HasColumnName("quiz_attempt_id").IsRequired();
        builder.Property(question => question.QuestionId).HasColumnName("question_id").IsRequired();
        builder.Property(question => question.DisplayOrder).HasColumnName("display_order").IsRequired();
        builder.Property(question => question.QuizReviewId).HasColumnName("quiz_review_id");
        builder.HasIndex(question => question.QuizAttemptId).HasDatabaseName("idx_quiz_attempt_questions_attempt");
    }
}

public sealed class QuizAttemptAnswerConfiguration : IEntityTypeConfiguration<QuizAttemptAnswer>
{
    public void Configure(EntityTypeBuilder<QuizAttemptAnswer> builder)
    {
        builder.ToTable("quiz_attempt_answers");
        builder.HasKey(answer => answer.Id);
        builder.Property(answer => answer.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(answer => answer.QuizAttemptQuestionId).HasColumnName("quiz_attempt_question_id").IsRequired();
        builder.Property(answer => answer.QuestionOptionId).HasColumnName("question_option_id");
        builder.Property(answer => answer.IsCorrect).HasColumnName("is_correct").HasDefaultValue(false);
        builder.Property(answer => answer.AwardedMarks).HasColumnName("awarded_marks").HasDefaultValue((short)0);
        builder.Property(answer => answer.SubmittedText).HasColumnName("submitted_text").HasMaxLength(1000);
        builder.HasIndex(answer => answer.QuizAttemptQuestionId).HasDatabaseName("idx_quiz_attempt_answers_link");
    }
}
