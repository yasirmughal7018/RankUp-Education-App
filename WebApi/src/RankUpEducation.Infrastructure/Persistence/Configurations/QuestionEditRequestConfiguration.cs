using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Infrastructure.Persistence.Configurations;

/// <summary>Maps <see cref="QuestionEditRequest"/> to app_question_edit_request.</summary>
public sealed class QuestionEditRequestConfiguration
    : IEntityTypeConfiguration<QuestionEditRequest>
{
    public void Configure(EntityTypeBuilder<QuestionEditRequest> builder)
    {
        builder.ToTable("app_question_edit_request");
        builder.HasKey(request => request.Id);
        builder.Property(request => request.Id)
            .HasColumnName("id")
            .UseIdentityAlwaysColumn();
        builder.Property(request => request.QuestionId).HasColumnName("question_id").IsRequired();
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
            .HasMaxLength(QuestionEditRequest.MaxReasonLength)
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
            .HasMaxLength(QuestionEditRequest.MaxReasonLength);

        builder.HasIndex(request => request.QuestionId);
        builder.HasIndex(request => request.Status);
        builder.HasIndex(request => new { request.QuestionId, request.RequestedByUserId })
            .IsUnique()
            .HasFilter("status = 0")
            .HasDatabaseName("ux_question_edit_request_pending_user");

        builder.HasOne<Question>()
            .WithMany()
            .HasForeignKey(request => request.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(request => request.RequestedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
