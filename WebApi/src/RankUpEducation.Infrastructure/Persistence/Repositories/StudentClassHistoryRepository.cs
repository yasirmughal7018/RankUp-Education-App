using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Application.Lookups;
using RankUpEducation.Domain.Students;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

/// <summary>Student class/section placement history persistence.</summary>
public sealed class StudentClassHistoryRepository : IStudentClassHistoryRepository
{
    private readonly RankUpDbContext _dbContext;

    public StudentClassHistoryRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task RecordInitialAsync(
        long studentId,
        short grade,
        string section,
        int? schoolId,
        int? campusId,
        long? changedByUserId,
        string source,
        DateTimeOffset at,
        CancellationToken cancellationToken)
    {
        var hasAny = await _dbContext.StudentClassHistories
            .AnyAsync(row => row.StudentId == studentId, cancellationToken);
        if (hasAny)
        {
            return;
        }

        await _dbContext.StudentClassHistories.AddAsync(
            StudentClassHistory.Start(
                studentId,
                grade,
                section,
                schoolId,
                campusId,
                at,
                changedByUserId,
                source),
            cancellationToken);
    }

    public async Task RecordChangeAsync(
        long studentId,
        short fromGrade,
        string fromSection,
        short toGrade,
        string toSection,
        int? schoolId,
        int? campusId,
        long? changedByUserId,
        string source,
        DateTimeOffset at,
        CancellationToken cancellationToken)
    {
        var normalizedFromSection = fromSection.Trim();
        var normalizedToSection = toSection.Trim();
        if (fromGrade == toGrade
            && string.Equals(normalizedFromSection, normalizedToSection, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var open = await _dbContext.StudentClassHistories
            .Where(row => row.StudentId == studentId && row.EndedAt == null)
            .OrderByDescending(row => row.StartedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (open is null)
        {
            var previous = StudentClassHistory.Start(
                studentId,
                fromGrade,
                fromSection,
                schoolId,
                campusId,
                at.AddSeconds(-1),
                changedByUserId,
                StudentClassHistorySources.Initial);
            previous.End(at);
            await _dbContext.StudentClassHistories.AddAsync(previous, cancellationToken);
        }
        else
        {
            open.End(at);
        }

        await _dbContext.StudentClassHistories.AddAsync(
            StudentClassHistory.Start(
                studentId,
                toGrade,
                toSection,
                schoolId,
                campusId,
                at,
                changedByUserId,
                source),
            cancellationToken);
    }

    public async Task<IReadOnlyList<StudentClassHistoryListItem>> ListForStudentAsync(
        long studentId,
        CancellationToken cancellationToken)
    {
        var rows = await (
            from history in _dbContext.StudentClassHistories.AsNoTracking()
            join school in _dbContext.Schools.AsNoTracking() on (long?)history.SchoolId equals school.Id into schools
            from school in schools.DefaultIfEmpty()
            join campus in _dbContext.Campuses.AsNoTracking() on (long?)history.CampusId equals campus.Id into campuses
            from campus in campuses.DefaultIfEmpty()
            join gradeLookup in _dbContext.Lookups.AsNoTracking()
                    .Where(lookup => lookup.Type == LookupNames.Class)
                on history.Grade equals gradeLookup.Id into grades
            from gradeLookup in grades.DefaultIfEmpty()
            where history.StudentId == studentId
            orderby history.StartedAt descending, history.Id descending
            select new StudentClassHistoryListItem(
                history.Id,
                history.Grade,
                gradeLookup != null && gradeLookup.Name != ""
                    ? gradeLookup.Name
                    : $"Grade {history.Grade}",
                history.Section,
                school != null ? school.Name : null,
                campus != null ? campus.Name : null,
                history.StartedAt,
                history.EndedAt,
                history.EndedAt == null,
                history.Source))
            .ToListAsync(cancellationToken);

        return rows;
    }
}
