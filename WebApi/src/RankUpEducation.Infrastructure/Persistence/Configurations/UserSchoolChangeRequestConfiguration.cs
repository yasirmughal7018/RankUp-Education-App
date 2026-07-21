using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Infrastructure.Persistence.Configurations;

/// <summary>Maps <see cref="UserSchoolChangeRequest"/> to app_user_school_change_request.</summary>
public sealed class UserSchoolChangeRequestConfiguration
    : IEntityTypeConfiguration<UserSchoolChangeRequest>
{
    public void Configure(EntityTypeBuilder<UserSchoolChangeRequest> builder)
    {
        builder.ToTable("app_user_school_change_request");
        builder.HasKey(request => request.Id);
        builder.Property(request => request.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(request => request.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(request => request.FromSchoolId).HasColumnName("from_school_id");
        builder.Property(request => request.FromCampusId).HasColumnName("from_campus_id");
        builder.Property(request => request.ToSchoolId).HasColumnName("to_school_id");
        builder.Property(request => request.ToCampusId).HasColumnName("to_campus_id");
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

        builder.HasIndex(request => request.UserId);
        builder.HasIndex(request => request.Status);
    }
}
