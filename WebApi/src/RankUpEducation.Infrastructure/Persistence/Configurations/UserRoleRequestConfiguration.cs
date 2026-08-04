using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Infrastructure.Persistence.Configurations;

/// <summary>Maps <see cref="UserRoleRequest"/> to app_user_role_request.</summary>
public sealed class UserRoleRequestConfiguration : IEntityTypeConfiguration<UserRoleRequest>
{
    public void Configure(EntityTypeBuilder<UserRoleRequest> builder)
    {
        builder.ToTable("app_user_role_request");
        builder.HasKey(request => request.Id);
        builder.Property(request => request.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(request => request.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(request => request.RequestedRole)
            .HasColumnName("requested_role")
            .HasColumnType("smallint")
            .HasConversion(role => (short)role, value => (UserRole)value)
            .IsRequired();
        builder.Property(request => request.SchoolId).HasColumnName("school_id");
        builder.Property(request => request.CampusId).HasColumnName("campus_id");
        builder.Property(request => request.TeacherCode)
            .HasColumnName("teacher_code")
            .HasMaxLength(UserRoleRequest.MaxTeacherCodeLength);
        builder.Property(request => request.ReasonMessage)
            .HasColumnName("reason_message")
            .HasMaxLength(UserRoleRequest.MaxReasonLength);
        builder.Property(request => request.Status)
            .HasColumnName("status")
            .HasColumnType("smallint")
            .HasConversion(status => (short)status, value => (RoleRequestStatus)value)
            .IsRequired();
        builder.Property(request => request.RequestedAt).HasColumnName("requested_at").IsRequired();
        builder.Property(request => request.ResolvedAt).HasColumnName("resolved_at");
        builder.Property(request => request.RejectionReason)
            .HasColumnName("rejection_reason")
            .HasMaxLength(UserRoleRequest.MaxRejectionReasonLength);
        builder.Property(request => request.ResolvedByUserId).HasColumnName("resolved_by_user_id");

        builder.HasIndex(request => request.UserId);
        builder.HasIndex(request => request.Status);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(request => request.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
