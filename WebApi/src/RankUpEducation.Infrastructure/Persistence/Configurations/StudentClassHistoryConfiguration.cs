using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RankUpEducation.Domain.Students;

namespace RankUpEducation.Infrastructure.Persistence.Configurations;

/// <summary>Maps <see cref="StudentClassHistory"/> to app_user_student_class_history.</summary>
public sealed class StudentClassHistoryConfiguration
    : IEntityTypeConfiguration<StudentClassHistory>
{
    public void Configure(EntityTypeBuilder<StudentClassHistory> builder)
    {
        builder.ToTable("app_user_student_class_history");
        builder.HasKey(row => row.Id);
        builder.Property(row => row.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(row => row.StudentId).HasColumnName("student_id").IsRequired();
        builder.Property(row => row.Grade).HasColumnName("grade").IsRequired();
        builder.Property(row => row.Section).HasColumnName("section").HasMaxLength(40).IsRequired();
        builder.Property(row => row.SchoolId).HasColumnName("school_id");
        builder.Property(row => row.CampusId).HasColumnName("campus_id");
        builder.Property(row => row.StartedAt).HasColumnName("started_at").IsRequired();
        builder.Property(row => row.EndedAt).HasColumnName("ended_at");
        builder.Property(row => row.ChangedByUserId).HasColumnName("changed_by_user_id");
        builder.Property(row => row.Source).HasColumnName("source").HasMaxLength(40).IsRequired();

        builder.HasIndex(row => new { row.StudentId, row.StartedAt })
            .HasDatabaseName("ix_app_user_student_class_history_student_started");
        builder.HasIndex(row => row.StudentId)
            .IsUnique()
            .HasFilter("ended_at IS NULL")
            .HasDatabaseName("ux_app_user_student_class_history_student_open");
    }
}
