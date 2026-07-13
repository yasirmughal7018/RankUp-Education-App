using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Infrastructure.Persistence.Configurations;

public sealed class UserApprovalConfiguration : IEntityTypeConfiguration<UserApproval>
{
    public void Configure(EntityTypeBuilder<UserApproval> builder)
    {
        builder.ToTable("app_user_approval");
        builder.HasKey(approval => approval.Id);
        builder.Property(approval => approval.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(approval => approval.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(approval => approval.ApprovedByUserId).HasColumnName("approved_by_user_id").IsRequired();
        builder.Property(approval => approval.ApprovedByRole)
            .HasColumnName("approved_by_role")
            .HasColumnType("smallint")
            .HasConversion(
                role => (short)role,
                value => (UserRole)value)
            .IsRequired();
        // Null = still pending with this approver.
        builder.Property(approval => approval.ApprovedAt).HasColumnName("approved_at");
        // Null = pending; true = approved; false = rejected.
        builder.Property(approval => approval.IsApproved).HasColumnName("is_approved");

        builder.HasIndex(approval => approval.UserId);
        builder.HasIndex(approval => approval.ApprovedByUserId);
        builder.HasIndex(approval => approval.ApprovedAt);
        builder.HasIndex(approval => approval.IsApproved);
        builder.HasIndex(approval => new { approval.UserId, approval.ApprovedByUserId, approval.ApprovedByRole })
            .IsUnique();

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(approval => approval.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(approval => approval.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
