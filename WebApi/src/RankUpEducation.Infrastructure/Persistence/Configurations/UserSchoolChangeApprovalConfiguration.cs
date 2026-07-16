using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Infrastructure.Persistence.Configurations;

public sealed class UserSchoolChangeApprovalConfiguration
    : IEntityTypeConfiguration<UserSchoolChangeApproval>
{
    public void Configure(EntityTypeBuilder<UserSchoolChangeApproval> builder)
    {
        builder.ToTable("app_user_school_change_approval");
        builder.HasKey(approval => approval.Id);
        builder.Property(approval => approval.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(approval => approval.RequestId).HasColumnName("request_id").IsRequired();
        builder.Property(approval => approval.ApprovedByUserId)
            .HasColumnName("approved_by_user_id")
            .IsRequired();
        builder.Property(approval => approval.ApprovedByRole)
            .HasColumnName("approved_by_role")
            .HasColumnType("smallint")
            .HasConversion(
                role => (short)role,
                value => (UserRole)value)
            .IsRequired();
        builder.Property(approval => approval.ApprovedAt).HasColumnName("approved_at");
        builder.Property(approval => approval.IsApproved).HasColumnName("is_approved");

        builder.HasIndex(approval => approval.RequestId);
        builder.HasIndex(approval => new { approval.RequestId, approval.ApprovedByUserId, approval.ApprovedByRole });
    }
}
