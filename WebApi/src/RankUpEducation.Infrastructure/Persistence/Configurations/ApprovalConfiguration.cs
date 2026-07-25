using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RankUpEducation.Domain.Approvals;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Infrastructure.Persistence.Configurations;

/// <summary>
/// Maps <see cref="Approval"/> to app_approval — the generic review queue + workflow trail
/// shared by registration (EntityType.User) and the question bank (EntityType.Question).
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

        // Exactly one target column is set, matching EntityType (enforced by a DB CHECK).
        builder.Property(approval => approval.UserId).HasColumnName("user_id");
        builder.Property(approval => approval.QuestionId).HasColumnName("question_id");

        builder.Property(approval => approval.ApprovedByUserId).HasColumnName("approved_by_user_id").IsRequired();
        builder.Property(approval => approval.ApprovedByRole)
            .HasColumnName("approved_by_role")
            .HasColumnType("smallint")
            .HasConversion(
                role => (short)role,
                value => (UserRole)value)
            .IsRequired();

        // Null while a user queue row is pending; always set on question trail rows.
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
        // Null = still pending with this approver.
        builder.Property(approval => approval.ApprovedAt).HasColumnName("approved_at");
        // Null = pending; true = approved; false = rejected.
        builder.Property(approval => approval.IsApproved).HasColumnName("is_approved");

        builder.HasIndex(approval => approval.EntityType);
        builder.HasIndex(approval => approval.UserId);
        builder.HasIndex(approval => approval.QuestionId);
        builder.HasIndex(approval => approval.ApprovedByUserId);
        builder.HasIndex(approval => approval.ApprovedAt);
        builder.HasIndex(approval => approval.IsApproved);

        // Registration keeps one row per approver. Question trails allow repeats from the
        // same admin (approve → deactivate → activate), so the constraint is User-only.
        builder.HasIndex(approval => new
            {
                approval.UserId,
                approval.ApprovedByUserId,
                approval.ApprovedByRole
            })
            .IsUnique()
            .HasFilter("entity_type = 1");

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(approval => approval.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Question>()
            .WithMany()
            .HasForeignKey(approval => approval.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(approval => approval.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
