using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Lookups;
using RankUpEducation.Domain.Parents;
using RankUpEducation.Domain.Quizzes;
using RankUpEducation.Domain.Schools;
using RankUpEducation.Domain.Students;
using RankUpEducation.Domain.Teachers;

namespace RankUpEducation.Infrastructure.Persistence.Configurations;

public sealed class LookupConfiguration : IEntityTypeConfiguration<Lookup>
{
    public void Configure(EntityTypeBuilder<Lookup> builder)
    {
        builder.ToTable("lookups");
        builder.HasKey(lookup => lookup.Id);
        builder.Property(lookup => lookup.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(lookup => lookup.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        builder.Property(lookup => lookup.Type).HasColumnName("type").HasMaxLength(100).IsRequired();
        builder.Property(lookup => lookup.OrderBy).HasColumnName("order_by").HasDefaultValue((short)0);
        builder.Property(lookup => lookup.IsActive).HasColumnName("is_active").HasDefaultValue(true);
        builder.Property(lookup => lookup.LookupRefId).HasColumnName("lookup_ref_id");
    }
}

public sealed class SchoolConfiguration : IEntityTypeConfiguration<School>
{
    public void Configure(EntityTypeBuilder<School> builder)
    {
        builder.ToTable("schools");
        builder.HasKey(school => school.Id);
        builder.Property(school => school.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(school => school.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        builder.Property(school => school.Code).HasColumnName("code").HasMaxLength(100).IsRequired();
        builder.HasIndex(school => school.Code).IsUnique();
        builder.Property(school => school.IsActive).HasColumnName("is_active").HasDefaultValue(true);
        builder.Property(school => school.IsDeleted).HasColumnName("is_deleted").HasDefaultValue(false);
        builder.Ignore(school => school.CreatedBy);
        builder.Ignore(school => school.CreatedAt);
        builder.Ignore(school => school.UpdatedAt);
        builder.Ignore(school => school.UpdatedBy);
        builder.Ignore(school => school.DeletedAt);
        builder.Ignore(school => school.DeletedBy);
    }
}

public sealed class CampusConfiguration : IEntityTypeConfiguration<Campus>
{
    public void Configure(EntityTypeBuilder<Campus> builder)
    {
        builder.ToTable("school_campuses");
        builder.HasKey(campus => campus.Id);
        builder.Property(campus => campus.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(campus => campus.SchoolId).HasColumnName("school_id").IsRequired();
        builder.Property(campus => campus.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        builder.Property(campus => campus.Address).HasColumnName("address").HasMaxLength(300).IsRequired();
        builder.Property(campus => campus.IsActive).HasColumnName("is_active").HasDefaultValue(true);
        builder.Property(campus => campus.CreatedDate).HasColumnName("created_date");
        builder.Property(campus => campus.ModifiedDate).HasColumnName("modified_date");
        builder.Property(campus => campus.IsDeleted).HasColumnName("is_deleted").HasDefaultValue(false);
        builder.Ignore(campus => campus.CreatedAt);
        builder.Ignore(campus => campus.UpdatedAt);
        builder.Ignore(campus => campus.CreatedBy);
        builder.Ignore(campus => campus.UpdatedBy);
        builder.Ignore(campus => campus.DeletedAt);
        builder.Ignore(campus => campus.DeletedBy);
    }
}

public sealed class StudentConfiguration : IEntityTypeConfiguration<Student>
{
    public void Configure(EntityTypeBuilder<Student> builder)
    {
        builder.ToTable("app_user_students");
        builder.HasKey(student => student.Id);
        builder.Property(student => student.Id).HasColumnName("student_id").ValueGeneratedNever();
        builder.Property(student => student.Grade).HasColumnName("grade").IsRequired();
        builder.Property(student => student.Section).HasColumnName("section").IsRequired();
        builder.Property(student => student.MobileNumber).HasColumnName("mobile_number").HasMaxLength(40);
        builder.Property(student => student.ModifiedDate).HasColumnName("modified_date");
        IgnoreSoftDeleteAudit(builder);
    }

    private static void IgnoreSoftDeleteAudit(EntityTypeBuilder<Student> builder)
    {
        builder.Ignore(student => student.CreatedAt);
        builder.Ignore(student => student.CreatedBy);
        builder.Ignore(student => student.UpdatedAt);
        builder.Ignore(student => student.UpdatedBy);
        builder.Ignore(student => student.IsDeleted);
        builder.Ignore(student => student.DeletedAt);
        builder.Ignore(student => student.DeletedBy);
    }
}

public sealed class ParentConfiguration : IEntityTypeConfiguration<Parent>
{
    public void Configure(EntityTypeBuilder<Parent> builder)
    {
        builder.ToTable("app_user_parents");
        builder.HasKey(parent => parent.Id);
        builder.Property(parent => parent.Id).HasColumnName("parent_id").ValueGeneratedNever();
        builder.Property(parent => parent.MobileNumber).HasColumnName("mobile_number").HasMaxLength(40);
        builder.Property(parent => parent.ModifiedDate).HasColumnName("modified_date");
        builder.Ignore(parent => parent.CreatedAt);
        builder.Ignore(parent => parent.CreatedBy);
        builder.Ignore(parent => parent.UpdatedAt);
        builder.Ignore(parent => parent.UpdatedBy);
        builder.Ignore(parent => parent.IsDeleted);
        builder.Ignore(parent => parent.DeletedAt);
        builder.Ignore(parent => parent.DeletedBy);
    }
}

public sealed class TeacherConfiguration : IEntityTypeConfiguration<Teacher>
{
    public void Configure(EntityTypeBuilder<Teacher> builder)
    {
        builder.ToTable("app_user_teachers");
        builder.HasKey(teacher => teacher.Id);
        builder.Property(teacher => teacher.Id).HasColumnName("teacher_id").ValueGeneratedNever();
        builder.Property(teacher => teacher.MobileNumber).HasColumnName("mobile_number").HasMaxLength(40);
        builder.Property(teacher => teacher.ModifiedDate).HasColumnName("modified_date");
        builder.Ignore(teacher => teacher.CreatedAt);
        builder.Ignore(teacher => teacher.CreatedBy);
        builder.Ignore(teacher => teacher.UpdatedAt);
        builder.Ignore(teacher => teacher.UpdatedBy);
        builder.Ignore(teacher => teacher.IsDeleted);
        builder.Ignore(teacher => teacher.DeletedAt);
        builder.Ignore(teacher => teacher.DeletedBy);
    }
}

public sealed class ParentStudentRelationConfiguration : IEntityTypeConfiguration<ParentStudentRelation>
{
    public void Configure(EntityTypeBuilder<ParentStudentRelation> builder)
    {
        builder.ToTable("parent_student_relations");
        builder.HasKey(relation => relation.Id);
        builder.Property(relation => relation.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(relation => relation.ParentId).HasColumnName("parent_id");
        builder.Property(relation => relation.StudentId).HasColumnName("student_id");
        builder.Property(relation => relation.Relationship).HasColumnName("relationship").HasMaxLength(50).IsRequired();
        builder.Property(relation => relation.IsActive).HasColumnName("is_active").HasDefaultValue(true);
        builder.Property(relation => relation.CreatedDate).HasColumnName("created_date");
        builder.HasIndex(relation => new { relation.ParentId, relation.StudentId }).IsUnique();
    }
}

public sealed class StudentGroupConfiguration : IEntityTypeConfiguration<StudentGroup>
{
    public void Configure(EntityTypeBuilder<StudentGroup> builder)
    {
        builder.ToTable("student_groups");
        builder.HasKey(group => group.Id);
        builder.Property(group => group.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(group => group.ReferralId).HasColumnName("referral_id");
        builder.Property(group => group.GroupName).HasColumnName("group_name").HasMaxLength(50).IsRequired();
        builder.Property(group => group.Description).HasColumnName("description").HasMaxLength(200).IsRequired();
        builder.Property(group => group.IsTeacherGroup).HasColumnName("is_teacher_group").HasDefaultValue(true);
        builder.Property(group => group.IsActive).HasColumnName("is_active").HasDefaultValue(true);
        builder.Property(group => group.CreatedDate).HasColumnName("created_date");
        builder.Property(group => group.UpdatedDate).HasColumnName("updated_date");
        builder.Property(group => group.CreatorRole)
            .HasColumnName("creator_role")
            .HasColumnType("smallint")
            .HasConversion(
                role => role.HasValue ? (short?)role.Value : null,
                value => value.HasValue ? (UserRole?)value.Value : null);
    }
}

public sealed class StudentGroupMemberConfiguration : IEntityTypeConfiguration<StudentGroupMember>
{
    public void Configure(EntityTypeBuilder<StudentGroupMember> builder)
    {
        builder.ToTable("student_group_members");
        builder.HasKey(member => member.Id);
        builder.Property(member => member.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(member => member.StudentGroupId).HasColumnName("student_group_id");
        builder.Property(member => member.StudentId).HasColumnName("student_id");
        builder.Property(member => member.CreatedDate).HasColumnName("created_date");
        builder.HasIndex(member => new { member.StudentGroupId, member.StudentId }).IsUnique();
    }
}
