using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Common;
using RankUpEducation.Domain.Lookups;
using RankUpEducation.Domain.Notifications;
using RankUpEducation.Domain.Parents;
using RankUpEducation.Domain.Questions;
using RankUpEducation.Domain.Quizzes;
using RankUpEducation.Domain.Schools;
using RankUpEducation.Domain.Students;
using RankUpEducation.Domain.Teachers;

namespace RankUpEducation.Infrastructure.Persistence;

public sealed class RankUpDbContext : DbContext, IUnitOfWork
{
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ICurrentUserService _currentUser;

    public RankUpDbContext(
        DbContextOptions<RankUpDbContext> options,
        IDateTimeProvider dateTimeProvider,
        ICurrentUserService currentUser)
        : base(options)
    {
        _dateTimeProvider = dateTimeProvider;
        _currentUser = currentUser;
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserRoleAssignment> UserRoleAssignments => Set<UserRoleAssignment>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<DeviceSession> DeviceSessions => Set<DeviceSession>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Lookup> Lookups => Set<Lookup>();
    public DbSet<School> Schools => Set<School>();
    public DbSet<Campus> Campuses => Set<Campus>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<Parent> Parents => Set<Parent>();
    public DbSet<ParentStudentRelation> ParentStudentRelations => Set<ParentStudentRelation>();
    public DbSet<Teacher> Teachers => Set<Teacher>();
    public DbSet<StudentGroup> StudentGroups => Set<StudentGroup>();
    public DbSet<StudentGroupMember> StudentGroupMembers => Set<StudentGroupMember>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<QuestionOption> QuestionOptions => Set<QuestionOption>();
    public DbSet<QuestionAcceptedAnswer> QuestionAcceptedAnswers => Set<QuestionAcceptedAnswer>();
    public DbSet<Quiz> Quizzes => Set<Quiz>();
    public DbSet<QuizAssignment> QuizAssignments => Set<QuizAssignment>();
    public DbSet<QuizQuestion> QuizQuestions => Set<QuizQuestion>();
    public DbSet<QuizReview> QuizReviews => Set<QuizReview>();
    public DbSet<QuizAttempt> QuizAttempts => Set<QuizAttempt>();
    public DbSet<QuizAttemptQuestion> QuizAttemptQuestions => Set<QuizAttemptQuestion>();
    public DbSet<QuizAttemptAnswer> QuizAttemptAnswers => Set<QuizAttemptAnswer>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(RankUpDbContext).Assembly);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditValues();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyAuditValues()
    {
        var now = _dateTimeProvider.UtcNow;
        var userId = _currentUser.UserId;

        foreach (var entry in ChangeTracker.Entries<AuditableEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.MarkCreated(now, userId);
            }

            if (entry.State == EntityState.Modified)
            {
                entry.Entity.MarkUpdated(now, userId);
            }
        }
    }
}
