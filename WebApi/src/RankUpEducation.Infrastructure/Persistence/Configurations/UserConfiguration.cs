using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Infrastructure.Persistence.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("app_users");
        builder.HasKey(user => user.Id);
        builder.Property(user => user.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(user => user.Username).HasColumnName("username").HasMaxLength(50).IsRequired();
        builder.HasIndex(user => user.Username).IsUnique();
        builder.Property(user => user.PasswordHash).HasColumnName("password_hash");
        builder.Property(user => user.FullName).HasColumnName("display_name").HasMaxLength(50);
        // Stored as lookups.id for type = UserRole (enum numeric values match lookup ids).
        builder.Property(user => user.Role)
            .HasColumnName("role")
            .HasColumnType("smallint")
            .HasConversion(
                role => (short)role,
                value => (UserRole)value)
            .IsRequired();
        builder.HasIndex(user => new { user.Id, user.Role }).IsUnique();
        builder.Property(user => user.IsActive).HasColumnName("is_active").HasDefaultValue(false);
        builder.Property(user => user.CreatedDate).HasColumnName("created_date");
        builder.Property(user => user.ModifiedDate).HasColumnName("modified_date");
        builder.Property(user => user.RequestedAt).HasColumnName("requested_at");
        builder.Property(user => user.MobileNumber).HasColumnName("mobile_number").HasMaxLength(40);
        builder.Property(user => user.Cnic).HasColumnName("cnic").HasMaxLength(20);
        builder.HasIndex(user => user.Cnic)
            .IsUnique()
            .HasFilter("cnic IS NOT NULL");
        builder.Property(user => user.SchoolId).HasColumnName("school_id");
        builder.Property(user => user.CampusId).HasColumnName("campus_id");
        builder.Property(user => user.EmailAddress).HasColumnName("email").HasMaxLength(120);
        builder.Property(user => user.MustChangePassword).HasColumnName("must_change_password");
        builder.Property(user => user.ReasonMessage).HasColumnName("reason_message").HasMaxLength(1000);
        builder.Property(user => user.AdminTarget).HasColumnName("admin_target").HasMaxLength(80);
        builder.Property(user => user.RollNumberTeacherCode)
            .HasColumnName("roll_number_teacher_code")
            .HasMaxLength(80);

        builder.Ignore(user => user.ProfileId);
        builder.Ignore(user => user.LastLoginAt);
        builder.Ignore(user => user.CreatedAt);
        builder.Ignore(user => user.CreatedBy);
        builder.Ignore(user => user.UpdatedAt);
        builder.Ignore(user => user.UpdatedBy);
        builder.Ignore(user => user.IsDeleted);
        builder.Ignore(user => user.DeletedAt);
        builder.Ignore(user => user.DeletedBy);

        builder.HasMany(user => user.RefreshTokens)
            .WithOne()
            .HasForeignKey(token => token.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(user => user.DeviceSessions)
            .WithOne()
            .HasForeignKey(session => session.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(user => user.RefreshTokens).UsePropertyAccessMode(PropertyAccessMode.Field);
        builder.Navigation(user => user.DeviceSessions).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
