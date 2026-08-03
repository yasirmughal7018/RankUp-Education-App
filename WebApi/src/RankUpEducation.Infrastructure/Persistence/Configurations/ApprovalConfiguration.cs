using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RankUpEducation.Domain.Approvals;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Infrastructure.Persistence.Configurations;

/// <summary>
/// Maps <see cref="Approval"/> to app_approval — the generic review queue + workflow trail
/// for registration, question bank, quizzes, and school/campus change requests.
/// </summary>
public sealed class ApprovalConfiguration : IEntityTypeConfiguration<Approval>
{
    public void Configure(EntityTypeBuilder<Approval> builder)
    {
        builder.ToTable("app_approval");
        builder.HasKey(approval => approval.Id);
        builder.Property(approval => approval.Id).HasColumnName("id").ValueGeneratedOnAdd();

        builder.Property(approval => approval.EntityType)
            .HasColumnName("entity_type")
            .HasColumnType("smallint")
            .HasConversion(
                entityType => (short)entityType,
                value => (ApprovalEntityType)value)
            .IsRequired();

        // Registration uses user_id; Question / Quiz / SchoolChangeRequest share request_id.
        builder.Property(approval => approval.UserId).HasColumnName("user_id");
        builder.Property(approval => approval.RequestId).HasColumnName("request_id");

        builder.Property(approval => approval.ApprovedByUserId).HasColumnName("approved_by_user_id").IsRequired();
        builder.Property(approval => approval.ApprovedByRole)
            .HasColumnName("approved_by_role")
            .HasColumnType("smallint")
            .HasConversion(
                role => (short)role,
                value => (UserRole)value)
            .IsRequired();

        // Null while a user/school-change queue row is pending; always set on question/quiz trail rows.
        builder.Property(approval => approval.Action)
            .HasColumnName("action")
            .HasColumnType("smallint")
            .HasConversion(
                action => action.HasValue ? (short?)action.Value : null,
                value => value.HasValue ? (ApprovalAction?)value.Value : null);

        builder.Property(approval => approval.Reason)
            .HasColumnName("reason")
            .HasMaxLength(Approval.MaxReasonLength);

        builder.Property(approval => approval.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(approval => approval.ApprovedAt).HasColumnName("approved_at");
        builder.Property(approval => approval.IsApproved).HasColumnName("is_approved");

        builder.HasIndex(approval => approval.EntityType);
        builder.HasIndex(approval => approval.UserId);
        builder.HasIndex(approval => approval.RequestId);
        builder.HasIndex(approval => approval.ApprovedByUserId);
        builder.HasIndex(approval => approval.ApprovedAt);
        builder.HasIndex(approval => approval.IsApproved);

        builder.HasIndex(approval => new
            {
                approval.UserId,
                approval.ApprovedByUserId,
                approval.ApprovedByRole
            })
            .IsUnique()
            .HasFilter("entity_type = 2101");

        builder.HasIndex(approval => new
            {
                approval.RequestId,
                approval.ApprovedByUserId,
                approval.ApprovedByRole
            })
            .IsUnique()
            .HasFilter("entity_type = 2104");

        builder.HasIndex(approval => new { approval.RequestId, approval.CreatedAt })
            .HasDatabaseName("ix_app_approval_question_trail")
            .HasFilter("entity_type = 2102");

        builder.HasIndex(approval => new { approval.RequestId, approval.CreatedAt })
            .HasDatabaseName("ix_app_approval_quiz_trail")
            .HasFilter("entity_type = 2103");

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(approval => approval.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // request_id is polymorphic (question / quiz / school-change request) — no single FK.

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(approval => approval.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
