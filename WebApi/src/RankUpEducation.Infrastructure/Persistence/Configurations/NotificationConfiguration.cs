using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RankUpEducation.Domain.Notifications;

namespace RankUpEducation.Infrastructure.Persistence.Configurations;

public sealed class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("app_notifications");
        builder.HasKey(notification => notification.Id);
        builder.Property(notification => notification.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(notification => notification.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(notification => notification.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
        builder.Property(notification => notification.Body).HasColumnName("body").HasMaxLength(2000).IsRequired();
        builder.Property(notification => notification.Category).HasColumnName("category").HasMaxLength(80).IsRequired();
        builder.Property(notification => notification.IsRead).HasColumnName("is_read").HasDefaultValue(false);
        builder.Property(notification => notification.CreatedAt).HasColumnName("created_at").IsRequired();

        builder.HasIndex(notification => new { notification.UserId, notification.CreatedAt });

        builder.Ignore(notification => notification.CreatedBy);
        builder.Ignore(notification => notification.UpdatedAt);
        builder.Ignore(notification => notification.UpdatedBy);
    }
}
