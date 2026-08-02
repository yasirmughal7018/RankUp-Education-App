using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Infrastructure.Persistence.Configurations;

/// <summary>Maps <see cref="UserPasswordResetRequest"/> to app_user_password_reset_request.</summary>
public sealed class UserPasswordResetRequestConfiguration
    : IEntityTypeConfiguration<UserPasswordResetRequest>
{
    public void Configure(EntityTypeBuilder<UserPasswordResetRequest> builder)
    {
        builder.ToTable("app_user_password_reset_request");
        builder.HasKey(request => request.Id);
        builder.Property(request => request.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(request => request.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(request => request.RequesterRole)
            .HasColumnName("requester_role")
            .HasColumnType("smallint")
            .HasConversion(
                role => (short)role,
                value => (UserRole)value)
            .IsRequired();
        builder.Property(request => request.Status)
            .HasColumnName("status")
            .HasColumnType("smallint")
            .HasConversion<short>()
            .IsRequired();
        builder.Property(request => request.RequestedAt).HasColumnName("requested_at").IsRequired();
        builder.Property(request => request.ResolvedAt).HasColumnName("resolved_at");
        builder.Property(request => request.CompletedByUserId).HasColumnName("completed_by_user_id");
        builder.Property(request => request.CompletedByRole)
            .HasColumnName("completed_by_role")
            .HasColumnType("smallint")
            .HasConversion(
                role => role.HasValue ? (short?)role.Value : null,
                value => value.HasValue ? (UserRole?)value.Value : null);
        builder.Property(request => request.EmailTokenHash)
            .HasColumnName("email_token_hash")
            .HasMaxLength(128);
        builder.Property(request => request.EmailTokenExpiresAt)
            .HasColumnName("email_token_expires_at");

        builder.HasIndex(request => request.UserId);
        builder.HasIndex(request => request.Status);
        builder.HasIndex(request => request.EmailTokenHash);
    }
}
