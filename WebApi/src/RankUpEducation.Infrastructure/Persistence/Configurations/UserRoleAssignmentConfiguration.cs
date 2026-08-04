using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Infrastructure.Persistence.Configurations;

/// <summary>Maps <see cref="UserRoleAssignment"/> to app_user_roles.</summary>
public sealed class UserRoleAssignmentConfiguration : IEntityTypeConfiguration<UserRoleAssignment>
{
    public void Configure(EntityTypeBuilder<UserRoleAssignment> builder)
    {
        builder.ToTable("app_user_roles");
        builder.HasKey(assignment => new { assignment.UserId, assignment.Role });
        builder.Property(assignment => assignment.UserId).HasColumnName("user_id");
        builder.Property(assignment => assignment.Role)
            .HasColumnName("role")
            .HasColumnType("smallint")
            .HasConversion(
                role => (short)role,
                value => (UserRole)value);
        builder.Property(assignment => assignment.CreatedAt).HasColumnName("created_at");
    }
}
