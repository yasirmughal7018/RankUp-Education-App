using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Infrastructure.Persistence.Configurations;

public sealed class DeviceSessionConfiguration : IEntityTypeConfiguration<DeviceSession>
{
    public void Configure(EntityTypeBuilder<DeviceSession> builder)
    {
        builder.ToTable("device_sessions");
        builder.HasKey(session => session.Id);
        builder.Property(session => session.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(session => session.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(session => session.DeviceId).HasColumnName("device_id").HasMaxLength(180).IsRequired();
        builder.Property(session => session.Platform).HasColumnName("platform").HasMaxLength(40);
        builder.Property(session => session.PushToken).HasColumnName("push_token").HasMaxLength(512);
        builder.Property(session => session.AppVersion).HasColumnName("app_version").HasMaxLength(40);
        builder.Property(session => session.LastSeenAt).HasColumnName("last_seen_at");
        builder.HasIndex(session => new { session.UserId, session.DeviceId }).IsUnique();
    }
}
