using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Infrastructure.Persistence.Configurations;

public sealed class QuestionConfiguration : IEntityTypeConfiguration<Question>
{
    public void Configure(EntityTypeBuilder<Question> builder)
    {
        builder.ToTable("questions");
        builder.HasKey(question => question.Id);
        builder.Property(question => question.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(question => question.QuestionText).HasColumnName("question_text").HasMaxLength(1000).IsRequired();
        builder.Property(question => question.QuestionTypeId).HasColumnName("question_type_id").IsRequired();
        builder.Property(question => question.ClassId).HasColumnName("class_id").IsRequired();
        builder.Property(question => question.SubjectId).HasColumnName("subject_id").IsRequired();
        builder.Property(question => question.TopicId).HasColumnName("topic_id");
        builder.Property(question => question.DifficultyLevel).HasColumnName("difficulty_level").IsRequired();
        builder.Property(question => question.Explanation).HasColumnName("explanation").HasMaxLength(1000);
        builder.Property(question => question.Hint).HasColumnName("hint").HasMaxLength(1000);
        builder.Property(question => question.EstimatedTimeSeconds).HasColumnName("estimated_time_seconds").IsRequired();
        builder.Property(question => question.Marks).HasColumnName("marks").IsRequired();
        builder.Property(question => question.IsActive).HasColumnName("is_active").HasDefaultValue(true);
        builder.Property(question => question.StatusId).HasColumnName("status_id").IsRequired();
        builder.Property(question => question.CreatedBy).HasColumnName("created_by").HasMaxLength(100).IsRequired();
        builder.Property(question => question.ApprovedBy).HasColumnName("approved_by").HasMaxLength(100);
        builder.Property(question => question.CreatedDate).HasColumnName("created_date");
        builder.Property(question => question.ModifiedDate).HasColumnName("modified_date");
        builder.Property(question => question.IsAiApproved).HasColumnName("is_ai_approved").HasDefaultValue(false);
        builder.Property(question => question.RejectionReason).HasColumnName("rejection_reason").HasMaxLength(1000);
        builder.HasIndex(question => new { question.ClassId, question.SubjectId, question.TopicId })
            .HasDatabaseName("idx_questions_lookup_ids");
        builder.Navigation(question => question.Options).UsePropertyAccessMode(PropertyAccessMode.Field);
        builder.Navigation(question => question.AcceptedAnswers).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

public sealed class QuestionOptionConfiguration : IEntityTypeConfiguration<QuestionOption>
{
    public void Configure(EntityTypeBuilder<QuestionOption> builder)
    {
        builder.ToTable("question_options");
        builder.HasKey(option => option.Id);
        builder.Property(option => option.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(option => option.QuestionId).HasColumnName("question_id").IsRequired();
        builder.Property(option => option.OptionText).HasColumnName("option_text").HasMaxLength(1000).IsRequired();
        builder.Property(option => option.OptionImageUrl).HasColumnName("option_image_url").HasMaxLength(512);
        builder.Property(option => option.IsCorrect).HasColumnName("is_correct").IsRequired();
        builder.Property(option => option.Explanation).HasColumnName("explanation").HasMaxLength(1000);
        builder.Property(option => option.IsActive).HasColumnName("is_active").HasDefaultValue(true);
    }
}

public sealed class QuestionAcceptedAnswerConfiguration : IEntityTypeConfiguration<QuestionAcceptedAnswer>
{
    public void Configure(EntityTypeBuilder<QuestionAcceptedAnswer> builder)
    {
        builder.ToTable("question_accepted_answers");
        builder.HasKey(answer => answer.Id);
        builder.Property(answer => answer.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(answer => answer.QuestionId).HasColumnName("question_id").IsRequired();
        builder.Property(answer => answer.AnswerText).HasColumnName("answer_text").HasMaxLength(1000).IsRequired();
        builder.Property(answer => answer.IsCaseSensitive).HasColumnName("is_case_sensitive").HasDefaultValue(false);
        builder.Property(answer => answer.AllowPartialMatch).HasColumnName("allow_partial_match").HasDefaultValue(false);
        builder.Property(answer => answer.NormalizedAnswer).HasColumnName("normalized_answer").HasMaxLength(1000).IsRequired();
        builder.Property(answer => answer.MinimumLength).HasColumnName("minimum_length").HasDefaultValue((short)0);
        builder.Property(answer => answer.MaximumLength).HasColumnName("maximum_length").HasDefaultValue(1000L);
        builder.Property(answer => answer.AiReview).HasColumnName("ai_review").HasMaxLength(1000);
        builder.Property(answer => answer.TeacherReview).HasColumnName("teacher_review").HasMaxLength(1000);
    }
}
