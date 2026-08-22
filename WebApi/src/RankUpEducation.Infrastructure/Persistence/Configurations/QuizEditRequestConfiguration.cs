using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Infrastructure.Persistence.Configurations;

/// <summary>Maps <see cref="QuizEditRequest"/> to app_quiz_edit_request.</summary>
public sealed class QuizEditRequestConfiguration
    : IEntityTypeConfiguration<QuizEditRequest>
{
    public void Configure(EntityTypeBuilder<QuizEditRequest> builder)
    {
        builder.ToTable("app_quiz_edit_request");
        builder.HasKey(request => request.Id);
        builder.Property(request => request.Id)
            .HasColumnName("id")
            .UseIdentityAlwaysColumn();
        builder.Property(request => request.QuizId).HasColumnName("quiz_id").IsRequired();
        builder.Property(request => request.RequestedByUserId)
            .HasColumnName("requested_by_user_id")
            .IsRequired();
        builder.Property(request => request.RequestedByRole)
            .HasColumnName("requested_by_role")
            .HasColumnType("smallint")
            .HasConversion(
                role => (short)role,
                value => (UserRole)value)
            .IsRequired();
        builder.Property(request => request.Reason)
            .HasColumnName("reason")
            .HasMaxLength(QuizEditRequest.MaxReasonLength)
            .IsRequired();
        builder.Property(request => request.Status)
            .HasColumnName("status")
            .HasColumnType("smallint")
            .HasConversion<short>()
            .IsRequired();
        builder.Property(request => request.RequestedAt).HasColumnName("requested_at").IsRequired();
        builder.Property(request => request.ResolvedAt).HasColumnName("resolved_at");
        builder.Property(request => request.EditUsedAt).HasColumnName("edit_used_at");
        builder.Property(request => request.DecisionReason)
            .HasColumnName("decision_reason")
            .HasMaxLength(QuizEditRequest.MaxReasonLength);

        builder.HasIndex(request => request.QuizId);
        builder.HasIndex(request => request.Status);
        builder.HasIndex(request => new { request.QuizId, request.RequestedByUserId })
            .IsUnique()
            .HasFilter("status = 0")
            .HasDatabaseName("ux_quiz_edit_request_pending_user");

        builder.HasOne<Quiz>()
            .WithMany()
            .HasForeignKey(request => request.QuizId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(request => request.RequestedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
