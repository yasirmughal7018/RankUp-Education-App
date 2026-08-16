using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Directory;
using RankUpEducation.Common.Utilities;
using RankUpEducation.Contracts.Directory;
using RankUpEducation.Contracts.Teachers;
using RankUpEducation.Domain.Approvals;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Coordinators;
using RankUpEducation.Domain.Parents;
using RankUpEducation.Domain.Schools;
using RankUpEducation.Domain.Students;
using RankUpEducation.Domain.Teachers;
using RankUpEducation.Domain.Tutors;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

/// <inheritdoc cref="RankUpEducation.Application.Directory.IDirectoryRepository"/>
public sealed class DirectoryRepository : IDirectoryRepository
{
    private readonly RankUpDbContext _dbContext;

    public DirectoryRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<SchoolResponse>> ListSchoolsAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Schools.AsNoTracking()
            .Where(school => !school.IsDeleted)
            .OrderBy(school => school.Name)
            .Select(school => new SchoolResponse(
                school.Id,
                school.Name,
                school.Code,
                school.IsActive,
                _dbContext.Campuses.Count(campus =>
                    campus.SchoolId == school.Id && !campus.IsDeleted)))
            .ToListAsync(cancellationToken);
    }

    public async Task<SchoolResponse?> GetSchoolAsync(long schoolId, CancellationToken cancellationToken)
    {
        return await _dbContext.Schools.AsNoTracking()
            .Where(school => school.Id == schoolId && !school.IsDeleted)
            .Select(school => new SchoolResponse(
                school.Id,
                school.Name,
                school.Code,
                school.IsActive,
                _dbContext.Campuses.Count(campus =>
                    campus.SchoolId == school.Id && !campus.IsDeleted)))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<SchoolResponse> CreateSchoolAsync(
        string name,
        string code,
        bool isActive,
        CancellationToken cancellationToken)
    {
        var school = new School(name, code);
        school.SetActive(isActive);
        await _dbContext.Schools.AddAsync(school, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return new SchoolResponse(school.Id, school.Name, school.Code, school.IsActive, CampusCount: 0);
    }

    public async Task<SchoolResponse?> UpdateSchoolAsync(
        long schoolId,
        string name,
        string code,
        bool isActive,
        CancellationToken cancellationToken)
    {
        var school = await _dbContext.Schools
            .FirstOrDefaultAsync(item => item.Id == schoolId && !item.IsDeleted, cancellationToken);
        if (school is null)
        {
            return null;
        }

        school.Update(name, code);
        school.SetActive(isActive);
        await _dbContext.SaveChangesAsync(cancellationToken);
        var campusCount = await _dbContext.Campuses.AsNoTracking()
            .CountAsync(campus => campus.SchoolId == school.Id && !campus.IsDeleted, cancellationToken);
        return new SchoolResponse(school.Id, school.Name, school.Code, school.IsActive, campusCount);
    }

    public async Task<bool> SetSchoolActiveAsync(long schoolId, bool isActive, CancellationToken cancellationToken)
    {
        var school = await _dbContext.Schools
            .FirstOrDefaultAsync(item => item.Id == schoolId && !item.IsDeleted, cancellationToken);
        if (school is null)
        {
            return false;
        }

        school.SetActive(isActive);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<CampusResponse>> ListCampusesAsync(long schoolId, CancellationToken cancellationToken)
    {
        var campuses = await _dbContext.Campuses.AsNoTracking()
            .Where(campus => campus.SchoolId == schoolId && !campus.IsDeleted)
            .OrderBy(campus => campus.Name)
            .Select(campus => new
            {
                campus.Id,
                campus.SchoolId,
                campus.Name,
                campus.Address,
                campus.IsActive,
            })
            .ToListAsync(cancellationToken);

        return campuses
            .Select(campus => new CampusResponse(
                campus.Id,
                campus.SchoolId,
                campus.Name,
                campus.Address.AsTrimmedOrNull(),
                campus.IsActive))
            .ToArray();
    }

    public async Task<CampusResponse?> GetCampusAsync(long campusId, CancellationToken cancellationToken)
    {
        var campus = await _dbContext.Campuses.AsNoTracking()
            .Where(item => item.Id == campusId && !item.IsDeleted)
            .Select(item => new
            {
                item.Id,
                item.SchoolId,
                item.Name,
                item.Address,
                item.IsActive,
            })
            .FirstOrDefaultAsync(cancellationToken);

        return campus is null
            ? null
            : new CampusResponse(
                campus.Id,
                campus.SchoolId,
                campus.Name,
                campus.Address.AsTrimmedOrNull(),
                campus.IsActive);
    }

    public async Task<CampusResponse> CreateCampusAsync(
        long schoolId,
        string name,
        string address,
        bool isActive,
        CancellationToken cancellationToken)
    {
        var campus = new Campus((int)schoolId, name, address);
        campus.SetActive(isActive);
        await _dbContext.Campuses.AddAsync(campus, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return new CampusResponse(
            campus.Id,
            campus.SchoolId,
            campus.Name,
            campus.Address.AsTrimmedOrNull(),
            campus.IsActive);
    }

    public async Task<CampusResponse?> UpdateCampusAsync(
        long campusId,
        string name,
        string address,
        bool isActive,
        CancellationToken cancellationToken)
    {
        var campus = await _dbContext.Campuses
            .FirstOrDefaultAsync(item => item.Id == campusId && !item.IsDeleted, cancellationToken);
        if (campus is null)
        {
            return null;
        }

        campus.Update(name, address);
        campus.SetActive(isActive);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return new CampusResponse(
            campus.Id,
            campus.SchoolId,
            campus.Name,
            campus.Address.AsTrimmedOrNull(),
            campus.IsActive);
    }

    public async Task<bool> SetCampusActiveAsync(long campusId, bool isActive, CancellationToken cancellationToken)
    {
        var campus = await _dbContext.Campuses
            .FirstOrDefaultAsync(item => item.Id == campusId && !item.IsDeleted, cancellationToken);
        if (campus is null)
        {
            return false;
        }

        campus.SetActive(isActive);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public Task<bool> SchoolExistsAsync(long schoolId, CancellationToken cancellationToken)
    {
        return _dbContext.Schools.AsNoTracking()
            .AnyAsync(school => school.Id == schoolId && !school.IsDeleted, cancellationToken);
    }

    public async Task<(IReadOnlyList<DirectoryStudentResponse> Items, int TotalCount)> ListStudentsAsync(
        int? schoolId,
        int? campusId,
        short? grade,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken,
        IReadOnlyList<long>? allowedStudentIds = null)
    {
        if (allowedStudentIds is { Count: 0 })
        {
            return (Array.Empty<DirectoryStudentResponse>(), 0);
        }

        var query =
            from student in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            where user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Student)
            select new { student, user };

        if (allowedStudentIds is not null)
        {
            query = query.Where(row => allowedStudentIds.Contains(row.student.Id));
        }

        if (schoolId is not null)
        {
            query = query.Where(row => row.user.SchoolId == schoolId.Value);
        }

        if (campusId is not null)
        {
            query = query.Where(row => row.user.CampusId == campusId.Value);
        }

        if (grade is not null)
        {
            query = query.Where(row => row.student.Grade == grade.Value);
        }

        if (search.HasTrimmedText())
        {
            var term = search.AsTrimmedString();
            query = query.Where(row =>
                row.user.FullName.Contains(term)
                || row.user.Username.Contains(term)
                || (row.user.RollNumberTeacherCode != null && row.user.RollNumberTeacherCode.Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderBy(row => row.user.FullName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(row => new
            {
                row.student.Id,
                row.user.FullName,
                row.user.Username,
                RollNumber = row.user.RollNumberTeacherCode ?? string.Empty,
                row.student.Grade,
                row.student.Section,
                SchoolId = row.user.SchoolId ?? 0,
                CampusId = row.user.CampusId ?? 0,
                row.user.IsActive,
                row.user.AvatarUrl,
                MobileNumber = row.user.MobileNumber ?? row.student.MobileNumber,
                row.user.Cnic,
                row.user.EmailAddress,
                row.user.CreatedDate,
                row.user.RequestedAt,
                row.user.RejectedAt,
                row.user.LastLoginAt,
                row.user.ReasonMessage,
                row.user.PasswordHash,
            })
            .ToListAsync(cancellationToken);

        var lockedSet = await GetLockedUserIdsAsync(
            rows.Select(row => row.Id).ToArray(),
            cancellationToken);

        var schoolIds = rows.Select(row => row.SchoolId).Where(id => id > 0).Distinct().ToArray();
        var campusIds = rows.Select(row => row.CampusId).Where(id => id > 0).Distinct().ToArray();
        var studentIds = rows.Select(row => row.Id).ToArray();

        var schoolNames = await GetSchoolNamesAsync(schoolIds, cancellationToken);
        var campusNames = await GetCampusNamesAsync(campusIds, cancellationToken);
        var teacherNamesByStudent = await GetTeacherNamesByStudentAsync(studentIds, cancellationToken);
        var coordinatorNamesByStudent = await GetCoordinatorNamesByStudentAsync(studentIds, cancellationToken);
        var parentNamesByStudent = await GetParentNamesByStudentAsync(studentIds, cancellationToken);
        var tutorNamesByStudent = await GetTutorNamesByStudentAsync(studentIds, cancellationToken);
        var approvalHistory = await GetApprovalHistoryByUserIdsAsync(studentIds, cancellationToken);

        var items = rows
            .Select(row => new DirectoryStudentResponse(
                row.Id,
                row.FullName,
                row.Username,
                row.RollNumber,
                row.Grade,
                row.Section,
                row.SchoolId,
                row.CampusId,
                row.IsActive,
                row.AvatarUrl,
                schoolNames.GetValueOrDefault(row.SchoolId, "—"),
                campusNames.GetValueOrDefault(row.CampusId, "—"),
                teacherNamesByStudent.GetValueOrDefault(row.Id, Array.Empty<string>()),
                coordinatorNamesByStudent.GetValueOrDefault(row.Id, Array.Empty<string>()),
                parentNamesByStudent.GetValueOrDefault(row.Id, Array.Empty<string>()),
                tutorNamesByStudent.GetValueOrDefault(row.Id, Array.Empty<string>()),
                row.MobileNumber,
                row.Cnic,
                row.EmailAddress,
                row.CreatedDate,
                row.RequestedAt,
                row.RejectedAt,
                row.LastLoginAt,
                row.ReasonMessage,
                row.IsActive && string.IsNullOrWhiteSpace(row.PasswordHash),
                approvalHistory.GetValueOrDefault(row.Id, Array.Empty<DirectoryApprovalHistoryItem>()),
                DirectoryAccountStatuses.Resolve(
                    row.IsActive,
                    !string.IsNullOrWhiteSpace(row.PasswordHash),
                    row.RejectedAt is not null,
                    lockedSet.Contains(row.Id))))
            .ToArray();

        return (items, totalCount);
    }

    public async Task<(IReadOnlyList<DirectoryTeacherResponse> Items, int TotalCount)> ListTeachersAsync(
        int? schoolId,
        int? campusId,
        string? search,
        bool? hasStudents,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query =
            from teacher in _dbContext.Teachers.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on teacher.Id equals user.Id
            where user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Teacher)
            select new { teacher, user };

        if (schoolId is not null)
        {
            query = query.Where(row => row.user.SchoolId == schoolId.Value);
        }

        if (campusId is not null)
        {
            query = query.Where(row => row.user.CampusId == campusId.Value);
        }

        if (hasStudents == true)
        {
            query = query.Where(row =>
                _dbContext.TeacherClassSections.Any(assignment =>
                    assignment.TeacherId == row.teacher.Id
                    && assignment.IsActive));
        }
        else if (hasStudents == false)
        {
            query = query.Where(row =>
                !_dbContext.TeacherClassSections.Any(assignment =>
                    assignment.TeacherId == row.teacher.Id
                    && assignment.IsActive));
        }

        if (search.HasTrimmedText())
        {
            var term = search.AsTrimmedString();
            query = query.Where(row =>
                row.user.FullName.Contains(term)
                || row.user.Username.Contains(term)
                || (row.user.RollNumberTeacherCode != null && row.user.RollNumberTeacherCode.Contains(term))
                || (row.user.MobileNumber != null && row.user.MobileNumber.Contains(term))
                || (row.teacher.MobileNumber != null && row.teacher.MobileNumber.Contains(term))
                || (row.user.EmailAddress != null && row.user.EmailAddress.Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderBy(row => row.user.FullName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(row => new
            {
                row.teacher.Id,
                row.user.FullName,
                row.user.Username,
                TeacherCode = row.user.RollNumberTeacherCode ?? string.Empty,
                SchoolId = row.user.SchoolId ?? 0,
                CampusId = row.user.CampusId ?? 0,
                row.user.IsActive,
                row.user.AvatarUrl,
                MobileNumber = row.user.MobileNumber ?? row.teacher.MobileNumber,
                row.user.Cnic,
                row.user.EmailAddress,
                row.user.CreatedDate,
                row.user.RequestedAt,
                row.user.RejectedAt,
                row.user.LastLoginAt,
                row.user.ReasonMessage,
                row.user.PasswordHash,
            })
            .ToListAsync(cancellationToken);

        var lockedSet = await GetLockedUserIdsAsync(
            rows.Select(row => row.Id).ToArray(),
            cancellationToken);

        var schoolIds = rows.Select(row => row.SchoolId).Where(id => id > 0).Distinct().ToArray();
        var campusIds = rows.Select(row => row.CampusId).Where(id => id > 0).Distinct().ToArray();
        var teacherIds = rows.Select(row => row.Id).ToArray();

        var schoolNames = await GetSchoolNamesAsync(schoolIds, cancellationToken);
        var campusNames = await GetCampusNamesAsync(campusIds, cancellationToken);
        var studentsByTeacher = await GetTeacherStudentsAsync(
            rows.Select(row => (row.Id, row.SchoolId, row.CampusId)).ToArray(),
            schoolNames,
            campusNames,
            cancellationToken);
        var approvalHistory = await GetApprovalHistoryByUserIdsAsync(teacherIds, cancellationToken);
        var rolesByUser = await GetRoleNamesByUserIdsAsync(teacherIds, cancellationToken);
        var classSectionsByTeacher = await GetTeacherClassSectionsAsync(teacherIds, cancellationToken);

        var items = rows
            .Select(row =>
            {
                var students = (IReadOnlyList<DirectoryLinkedStudentSummary>)studentsByTeacher
                    .GetValueOrDefault(row.Id, Array.Empty<DirectoryLinkedStudentSummary>());
                return new DirectoryTeacherResponse(
                    row.Id,
                    row.FullName,
                    row.Username,
                    row.TeacherCode,
                    row.SchoolId,
                    row.CampusId,
                    row.IsActive,
                    row.AvatarUrl,
                    schoolNames.GetValueOrDefault(row.SchoolId, "—"),
                    campusNames.GetValueOrDefault(row.CampusId, "—"),
                    students.Count,
                    row.MobileNumber,
                    row.Cnic,
                    row.EmailAddress,
                    row.CreatedDate,
                    row.RequestedAt,
                    row.RejectedAt,
                    row.LastLoginAt,
                    row.ReasonMessage,
                    row.IsActive && string.IsNullOrWhiteSpace(row.PasswordHash),
                    approvalHistory.GetValueOrDefault(row.Id, Array.Empty<DirectoryApprovalHistoryItem>()),
                    DirectoryAccountStatuses.Resolve(
                        row.IsActive,
                        !string.IsNullOrWhiteSpace(row.PasswordHash),
                        row.RejectedAt is not null,
                        lockedSet.Contains(row.Id)),
                    rolesByUser.GetValueOrDefault(row.Id, Array.Empty<string>()),
                    classSectionsByTeacher.GetValueOrDefault(row.Id, Array.Empty<TeacherClassSectionItem>()),
                    students);
            })
            .ToArray();

        return (items, totalCount);
    }

    public async Task<(IReadOnlyList<DirectoryParentResponse> Items, int TotalCount)> ListParentsAsync(
        string? search,
        int? schoolId,
        int? campusId,
        bool? hasLinkedStudents,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query =
            from parent in _dbContext.Parents.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on parent.Id equals user.Id
            where user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Parent)
            select new { parent, user };

        if (schoolId is not null)
        {
            var scopedStudentIds = ScopedStudentIdsQuery(schoolId.Value, campusId);
            query = query.Where(row =>
                _dbContext.ParentStudentRelations.Any(relation =>
                    relation.ParentId == row.parent.Id
                    && relation.IsActive
                    && scopedStudentIds.Contains(relation.StudentId)));
        }

        if (hasLinkedStudents == true)
        {
            query = query.Where(row =>
                _dbContext.ParentStudentRelations.Any(relation =>
                    relation.ParentId == row.parent.Id && relation.IsActive));
        }
        else if (hasLinkedStudents == false)
        {
            query = query.Where(row =>
                !_dbContext.ParentStudentRelations.Any(relation =>
                    relation.ParentId == row.parent.Id && relation.IsActive));
        }

        if (search.HasTrimmedText())
        {
            var term = search.AsTrimmedString();
            query = query.Where(row =>
                row.user.FullName.Contains(term)
                || row.user.Username.Contains(term)
                || (row.user.MobileNumber != null && row.user.MobileNumber.Contains(term))
                || (row.parent.MobileNumber != null && row.parent.MobileNumber.Contains(term))
                || (row.user.Cnic != null && row.user.Cnic.Contains(term))
                || (row.user.EmailAddress != null && row.user.EmailAddress.Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderBy(row => row.user.FullName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        if (rows.Count == 0)
        {
            return (Array.Empty<DirectoryParentResponse>(), totalCount);
        }

        var parentIds = rows.Select(row => row.parent.Id).ToArray();
        var linkedStudentsQuery =
            from relation in _dbContext.ParentStudentRelations.AsNoTracking()
            join studentUser in _dbContext.Users.AsNoTracking() on relation.StudentId equals studentUser.Id
            join student in _dbContext.Students.AsNoTracking() on relation.StudentId equals student.Id
            where parentIds.Contains(relation.ParentId) && relation.IsActive
            select new
            {
                relation.ParentId,
                relation.StudentId,
                studentUser.FullName,
                studentUser.Username,
                studentUser.AvatarUrl,
                studentUser.SchoolId,
                studentUser.CampusId,
                student.Grade,
                student.Section,
                studentUser.IsActive,
                HasPassword = studentUser.PasswordHash != null && studentUser.PasswordHash != "",
                IsRejected = studentUser.RejectedAt != null,
            };

        if (schoolId is not null)
        {
            linkedStudentsQuery = linkedStudentsQuery.Where(row =>
                row.SchoolId == schoolId.Value
                && (campusId == null || row.CampusId == campusId.Value));
        }

        var linkedStudents = await linkedStudentsQuery
            .OrderBy(row => row.FullName)
            .ToListAsync(cancellationToken);

        var linkedSchoolIds = linkedStudents
            .Select(row => row.SchoolId ?? 0)
            .Where(id => id > 0)
            .Distinct()
            .ToArray();
        var linkedCampusIds = linkedStudents
            .Select(row => row.CampusId ?? 0)
            .Where(id => id > 0)
            .Distinct()
            .ToArray();
        var linkedSchoolNames = await GetSchoolNamesAsync(linkedSchoolIds, cancellationToken);
        var linkedCampusNames = await GetCampusNamesAsync(linkedCampusIds, cancellationToken);
        var linkedStudentLockedSet = await GetLockedUserIdsAsync(
            linkedStudents.Select(row => row.StudentId).Distinct().ToArray(),
            cancellationToken);

        var linkedByParent = linkedStudents
            .GroupBy(item => item.ParentId)
            .ToDictionary(
                group => group.Key,
                group => group
                    .Select(item => new DirectoryLinkedStudentSummary(
                        item.StudentId,
                        item.FullName,
                        item.Username,
                        item.AvatarUrl,
                        item.SchoolId is int schoolKey
                            ? linkedSchoolNames.GetValueOrDefault(schoolKey, "—")
                            : "—",
                        item.CampusId is int campusKey
                            ? linkedCampusNames.GetValueOrDefault(campusKey, "—")
                            : "—",
                        item.Grade,
                        item.Section,
                        item.IsActive,
                        DirectoryAccountStatuses.Resolve(
                            item.IsActive,
                            item.HasPassword,
                            item.IsRejected,
                            linkedStudentLockedSet.Contains(item.StudentId))))
                    .ToArray());

        var lockedSet = await GetLockedUserIdsAsync(parentIds, cancellationToken);
        var approvalHistory = await GetApprovalHistoryByUserIdsAsync(parentIds, cancellationToken);
        var rolesByUser = await GetRoleNamesByUserIdsAsync(parentIds, cancellationToken);

        var items = rows.Select(row =>
        {
            var linked = (IReadOnlyList<DirectoryLinkedStudentSummary>)linkedByParent
                .GetValueOrDefault(row.parent.Id, Array.Empty<DirectoryLinkedStudentSummary>());
            var names = (IReadOnlyList<string>)linked.Select(student => student.FullName).ToArray();
            return new DirectoryParentResponse(
                row.parent.Id,
                row.user.FullName,
                row.user.Username,
                linked.Count,
                names,
                row.user.IsActive,
                row.user.AvatarUrl,
                row.user.MobileNumber ?? row.parent.MobileNumber,
                row.user.Cnic,
                row.user.EmailAddress,
                row.user.CreatedDate,
                row.user.RequestedAt,
                row.user.RejectedAt,
                row.user.LastLoginAt,
                row.user.ReasonMessage,
                row.user.NeedsPasswordSetup,
                approvalHistory.GetValueOrDefault(row.parent.Id, Array.Empty<DirectoryApprovalHistoryItem>()),
                DirectoryAccountStatuses.FromUser(row.user, lockedSet.Contains(row.parent.Id)),
                rolesByUser.GetValueOrDefault(row.parent.Id, Array.Empty<string>()),
                linked);
        }).ToArray();

        return (items, totalCount);
    }

    public async Task<(IReadOnlyList<DirectoryTutorResponse> Items, int TotalCount)> ListTutorsAsync(
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query =
            from tutor in _dbContext.Tutors.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on tutor.Id equals user.Id
            where user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Tutor)
            select new { tutor, user };

        if (search.HasTrimmedText())
        {
            var term = search.AsTrimmedString();
            query = query.Where(row =>
                row.user.FullName.Contains(term)
                || row.user.Username.Contains(term)
                || (row.user.MobileNumber != null && row.user.MobileNumber.Contains(term))
                || (row.tutor.MobileNumber != null && row.tutor.MobileNumber.Contains(term))
                || (row.user.Cnic != null && row.user.Cnic.Contains(term))
                || (row.user.EmailAddress != null && row.user.EmailAddress.Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderBy(row => row.user.FullName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        if (rows.Count == 0)
        {
            return (Array.Empty<DirectoryTutorResponse>(), totalCount);
        }

        var tutorIds = rows.Select(row => row.tutor.Id).ToArray();
        var linkedStudents = await (
            from relation in _dbContext.TutorStudentRelations.AsNoTracking()
            join studentUser in _dbContext.Users.AsNoTracking() on relation.StudentId equals studentUser.Id
            join student in _dbContext.Students.AsNoTracking() on relation.StudentId equals student.Id
            where tutorIds.Contains(relation.TutorId) && relation.IsActive
            orderby studentUser.FullName
            select new
            {
                relation.TutorId,
                relation.StudentId,
                studentUser.FullName,
                studentUser.Username,
                studentUser.AvatarUrl,
                studentUser.SchoolId,
                studentUser.CampusId,
                student.Grade,
                student.Section,
                studentUser.IsActive,
                HasPassword = studentUser.PasswordHash != null && studentUser.PasswordHash != "",
                IsRejected = studentUser.RejectedAt != null,
            })
            .ToListAsync(cancellationToken);

        var linkedSchoolIds = linkedStudents
            .Select(row => row.SchoolId ?? 0)
            .Where(id => id > 0)
            .Distinct()
            .ToArray();
        var linkedCampusIds = linkedStudents
            .Select(row => row.CampusId ?? 0)
            .Where(id => id > 0)
            .Distinct()
            .ToArray();
        var linkedSchoolNames = await GetSchoolNamesAsync(linkedSchoolIds, cancellationToken);
        var linkedCampusNames = await GetCampusNamesAsync(linkedCampusIds, cancellationToken);
        var linkedStudentLockedSet = await GetLockedUserIdsAsync(
            linkedStudents.Select(row => row.StudentId).Distinct().ToArray(),
            cancellationToken);

        var linkedByTutor = linkedStudents
            .GroupBy(item => item.TutorId)
            .ToDictionary(
                group => group.Key,
                group => group
                    .Select(item => new DirectoryLinkedStudentSummary(
                        item.StudentId,
                        item.FullName,
                        item.Username,
                        item.AvatarUrl,
                        item.SchoolId is int schoolKey
                            ? linkedSchoolNames.GetValueOrDefault(schoolKey, "—")
                            : "—",
                        item.CampusId is int campusKey
                            ? linkedCampusNames.GetValueOrDefault(campusKey, "—")
                            : "—",
                        item.Grade,
                        item.Section,
                        item.IsActive,
                        DirectoryAccountStatuses.Resolve(
                            item.IsActive,
                            item.HasPassword,
                            item.IsRejected,
                            linkedStudentLockedSet.Contains(item.StudentId))))
                    .ToArray());

        var lockedSet = await GetLockedUserIdsAsync(tutorIds, cancellationToken);
        var approvalHistory = await GetApprovalHistoryByUserIdsAsync(tutorIds, cancellationToken);
        var rolesByUser = await GetRoleNamesByUserIdsAsync(tutorIds, cancellationToken);

        var items = rows.Select(row =>
        {
            var linked = (IReadOnlyList<DirectoryLinkedStudentSummary>)linkedByTutor
                .GetValueOrDefault(row.tutor.Id, Array.Empty<DirectoryLinkedStudentSummary>());
            var names = (IReadOnlyList<string>)linked.Select(student => student.FullName).ToArray();
            return new DirectoryTutorResponse(
                row.tutor.Id,
                row.user.FullName,
                row.user.Username,
                linked.Count,
                names,
                row.user.IsActive,
                row.user.AvatarUrl,
                row.user.MobileNumber ?? row.tutor.MobileNumber,
                row.user.Cnic,
                row.user.EmailAddress,
                row.user.CreatedDate,
                row.user.RequestedAt,
                row.user.RejectedAt,
                row.user.LastLoginAt,
                row.user.ReasonMessage,
                row.user.NeedsPasswordSetup,
                approvalHistory.GetValueOrDefault(row.tutor.Id, Array.Empty<DirectoryApprovalHistoryItem>()),
                DirectoryAccountStatuses.FromUser(row.user, lockedSet.Contains(row.tutor.Id)),
                rolesByUser.GetValueOrDefault(row.tutor.Id, Array.Empty<string>()),
                linked);
        }).ToArray();

        return (items, totalCount);
    }

    public async Task<bool> ParentHasStudentInScopeAsync(
        long parentId,
        int? schoolId,
        int? campusId,
        CancellationToken cancellationToken)
    {
        // No school filter = unrestricted (Portal Admin).
        if (schoolId is null)
        {
            return true;
        }

        var scopedStudentIds = ScopedStudentIdsQuery(schoolId.Value, campusId);
        return await _dbContext.ParentStudentRelations.AsNoTracking()
            .AnyAsync(
                relation =>
                    relation.ParentId == parentId
                    && relation.IsActive
                    && scopedStudentIds.Contains(relation.StudentId),
                cancellationToken);
    }

    public Task<Student?> GetStudentEntityAsync(long studentId, CancellationToken cancellationToken)
    {
        return _dbContext.Students
            .FirstOrDefaultAsync(student => student.Id == studentId, cancellationToken);
    }

    public Task<Teacher?> GetTeacherEntityAsync(long teacherId, CancellationToken cancellationToken)
    {
        return _dbContext.Teachers
            .FirstOrDefaultAsync(teacher => teacher.Id == teacherId, cancellationToken);
    }

    public Task<Parent?> GetParentEntityAsync(long parentId, CancellationToken cancellationToken)
    {
        return _dbContext.Parents
            .FirstOrDefaultAsync(parent => parent.Id == parentId, cancellationToken);
    }

    public Task<Tutor?> GetTutorEntityAsync(long tutorId, CancellationToken cancellationToken)
    {
        return _dbContext.Tutors
            .FirstOrDefaultAsync(tutor => tutor.Id == tutorId, cancellationToken);
    }

    public async Task SetUserActiveAsync(long userId, bool isActive, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(item => item.Id == userId, cancellationToken)
            ?? throw new InvalidOperationException($"User {userId} was not found.");

        user.SetActive(isActive);
    }

    public async Task LinkParentStudentAsync(
        long parentId,
        long studentId,
        string relationship,
        CancellationToken cancellationToken)
    {
        var existing = await _dbContext.ParentStudentRelations
            .FirstOrDefaultAsync(
                relation => relation.ParentId == parentId && relation.StudentId == studentId,
                cancellationToken);

        if (existing is null)
        {
            await _dbContext.ParentStudentRelations.AddAsync(
                new ParentStudentRelation(parentId, studentId, relationship),
                cancellationToken);
            return;
        }

        existing.Activate(relationship);
    }

    public async Task UnlinkParentStudentAsync(long parentId, long studentId, CancellationToken cancellationToken)
    {
        var existing = await _dbContext.ParentStudentRelations
            .FirstOrDefaultAsync(
                relation => relation.ParentId == parentId && relation.StudentId == studentId && relation.IsActive,
                cancellationToken);

        existing?.Deactivate();
    }

    public async Task LinkTutorStudentAsync(long tutorId, long studentId, CancellationToken cancellationToken)
    {
        var existing = await _dbContext.TutorStudentRelations
            .FirstOrDefaultAsync(
                relation => relation.TutorId == tutorId && relation.StudentId == studentId,
                cancellationToken);

        if (existing is null)
        {
            await _dbContext.TutorStudentRelations.AddAsync(
                new TutorStudentRelation(tutorId, studentId),
                cancellationToken);
            return;
        }

        existing.Activate();
    }

    public async Task UnlinkTutorStudentAsync(long tutorId, long studentId, CancellationToken cancellationToken)
    {
        var existing = await _dbContext.TutorStudentRelations
            .FirstOrDefaultAsync(
                relation => relation.TutorId == tutorId && relation.StudentId == studentId && relation.IsActive,
                cancellationToken);

        existing?.Deactivate();
    }

    public Task<bool> IsTutorStudentLinkedAsync(
        long tutorId,
        long studentId,
        CancellationToken cancellationToken)
    {
        return _dbContext.TutorStudentRelations.AsNoTracking()
            .AnyAsync(
                relation =>
                    relation.TutorId == tutorId
                    && relation.StudentId == studentId
                    && relation.IsActive,
                cancellationToken);
    }

    public Task<bool> ParentExistsAsync(long parentId, CancellationToken cancellationToken)
    {
        return _dbContext.Parents.AsNoTracking()
            .AnyAsync(parent => parent.Id == parentId, cancellationToken);
    }

    public Task<bool> TutorExistsAsync(long tutorId, CancellationToken cancellationToken)
    {
        return _dbContext.Tutors.AsNoTracking()
            .AnyAsync(tutor => tutor.Id == tutorId, cancellationToken);
    }

    public Task<bool> StudentExistsAsync(long studentId, CancellationToken cancellationToken)
    {
        return _dbContext.Students.AsNoTracking()
            .AnyAsync(student => student.Id == studentId, cancellationToken);
    }

    public async Task<StudentAssignedPeople> GetAssignedPeopleForStudentAsync(
        long studentId,
        CancellationToken cancellationToken)
    {
        var student = await (
            from row in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on row.Id equals user.Id
            where row.Id == studentId
            select new
            {
                row.Id,
                user.SchoolId,
                user.CampusId,
                row.Grade,
                row.Section,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (student is null)
        {
            return new StudentAssignedPeople([], [], [], []);
        }

        var parents = await (
            from relation in _dbContext.ParentStudentRelations.AsNoTracking()
            join parentUser in _dbContext.Users.AsNoTracking() on relation.ParentId equals parentUser.Id
            where relation.StudentId == studentId && relation.IsActive
            orderby parentUser.FullName
            select new StudentAssignedPerson(
                parentUser.FullName,
                string.IsNullOrWhiteSpace(relation.Relationship) ? "Guardian" : relation.Relationship))
            .ToListAsync(cancellationToken);

        var tutors = await (
            from relation in _dbContext.TutorStudentRelations.AsNoTracking()
            join tutorUser in _dbContext.Users.AsNoTracking() on relation.TutorId equals tutorUser.Id
            where relation.StudentId == studentId && relation.IsActive
            orderby tutorUser.FullName
            select new StudentAssignedPerson(tutorUser.FullName, "Linked tutor"))
            .ToListAsync(cancellationToken);

        if (student.SchoolId is null || student.CampusId is null)
        {
            return new StudentAssignedPeople(parents, [], [], tutors);
        }

        var teachers = await (
            from assignment in _dbContext.TeacherClassSections.AsNoTracking()
            join teacherUser in _dbContext.Users.AsNoTracking() on assignment.TeacherId equals teacherUser.Id
            where assignment.IsActive
                && teacherUser.SchoolId == student.SchoolId
                && teacherUser.CampusId == student.CampusId
                && assignment.Grade == student.Grade
                && teacherUser.RoleAssignments.Any(role => role.Role == UserRole.Teacher)
            select new
            {
                teacherUser.FullName,
                assignment.Section,
            })
            .ToListAsync(cancellationToken);

        var teacherPeople = teachers
            .Where(teacher =>
                string.Equals(teacher.Section, student.Section, StringComparison.OrdinalIgnoreCase)
                && teacher.FullName.HasTrimmedText())
            .GroupBy(teacher => teacher.FullName, StringComparer.OrdinalIgnoreCase)
            .OrderBy(group => group.Key)
            .Select(group => new StudentAssignedPerson(
                group.Key,
                $"Grade {student.Grade} · {student.Section}"))
            .ToArray();

        var coordinators = await (
            from assignment in _dbContext.CoordinatorClassSections.AsNoTracking()
            join coordinatorUser in _dbContext.Users.AsNoTracking()
                on assignment.CoordinatorUserId equals coordinatorUser.Id
            where assignment.IsActive
                && coordinatorUser.SchoolId == student.SchoolId
                && coordinatorUser.CampusId == student.CampusId
                && assignment.Grade == student.Grade
                && coordinatorUser.RoleAssignments.Any(role => role.Role == UserRole.Coordinator)
            select new
            {
                coordinatorUser.FullName,
                assignment.Section,
            })
            .ToListAsync(cancellationToken);

        var coordinatorPeople = coordinators
            .Where(coordinator =>
                coordinator.FullName.HasTrimmedText()
                && (CoordinatorClassSection.IsFullClassSection(coordinator.Section)
                    || string.IsNullOrWhiteSpace(coordinator.Section)
                    || string.Equals(
                        coordinator.Section,
                        student.Section,
                        StringComparison.OrdinalIgnoreCase)))
            .GroupBy(coordinator => coordinator.FullName, StringComparer.OrdinalIgnoreCase)
            .OrderBy(group => group.Key)
            .Select(group =>
            {
                var coversFullGrade = group.Any(item =>
                    CoordinatorClassSection.IsFullClassSection(item.Section)
                    || string.IsNullOrWhiteSpace(item.Section));
                var detail = coversFullGrade
                    ? $"Grade {student.Grade} · All sections"
                    : $"Grade {student.Grade} · {student.Section}";
                return new StudentAssignedPerson(group.Key, detail);
            })
            .ToArray();

        return new StudentAssignedPeople(parents, coordinatorPeople, teacherPeople, tutors);
    }

    public Task<int> CountParentStudentLinksAsync(long parentId, CancellationToken cancellationToken)
    {
        return _dbContext.ParentStudentRelations.AsNoTracking()
            .CountAsync(
                relation => relation.ParentId == parentId && relation.IsActive,
                cancellationToken);
    }

    public Task<int> CountTutorStudentLinksAsync(long tutorId, CancellationToken cancellationToken)
    {
        return _dbContext.TutorStudentRelations.AsNoTracking()
            .CountAsync(
                relation => relation.TutorId == tutorId && relation.IsActive,
                cancellationToken);
    }

    public async Task<(IReadOnlyList<DirectorySchoolAdminResponse> Items, int TotalCount)> ListSchoolAdminsAsync(
        int? schoolId,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Users.AsNoTracking()
            .Where(user => user.RoleAssignments.Any(assignment => assignment.Role == UserRole.SchoolAdmin));

        if (schoolId is not null)
        {
            query = query.Where(user => user.SchoolId == schoolId.Value);
        }

        if (search.HasTrimmedText())
        {
            var term = search.AsTrimmedString();
            query = query.Where(user =>
                user.FullName.Contains(term)
                || user.Username.Contains(term)
                || (user.MobileNumber != null && user.MobileNumber.Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var users = await query
            .OrderBy(user => user.FullName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var schoolIds = users
            .Where(user => user.SchoolId.HasValue)
            .Select(user => (long)user.SchoolId!.Value)
            .Distinct()
            .ToArray();

        var schoolNames = await _dbContext.Schools.AsNoTracking()
            .Where(school => schoolIds.Contains(school.Id) && !school.IsDeleted)
            .ToDictionaryAsync(school => school.Id, school => school.Name, cancellationToken);

        var lockedSet = await GetLockedUserIdsAsync(
            users.Select(user => user.Id).ToArray(),
            cancellationToken);

        var schoolIdKeys = users
            .Select(user => user.SchoolId ?? 0)
            .Where(id => id > 0)
            .Distinct()
            .ToArray();
        var campusCounts = await CountActiveCampusesBySchoolAsync(schoolIdKeys, cancellationToken);
        var teacherCounts = await CountReadyUsersBySchoolAsync(UserRole.Teacher, schoolIdKeys, cancellationToken);
        var studentCounts = await CountReadyUsersBySchoolAsync(UserRole.Student, schoolIdKeys, cancellationToken);
        var approvalHistory = await GetApprovalHistoryByUserIdsAsync(
            users.Select(user => user.Id).ToArray(),
            cancellationToken);

        var items = users
            .Select(user =>
            {
                var sid = user.SchoolId ?? 0;
                var schoolName = schoolNames.TryGetValue(sid, out var name) ? name : "—";
                return new DirectorySchoolAdminResponse(
                    user.Id,
                    user.FullName,
                    user.Username,
                    sid,
                    schoolName,
                    user.MobileNumber,
                    user.Cnic,
                    user.EmailAddress,
                    user.IsActive,
                    user.NeedsPasswordSetup,
                    user.AvatarUrl,
                    campusCounts.GetValueOrDefault(sid),
                    teacherCounts.GetValueOrDefault(sid),
                    studentCounts.GetValueOrDefault(sid),
                    user.CreatedDate,
                    user.RequestedAt,
                    user.RejectedAt,
                    user.LastLoginAt,
                    user.ReasonMessage,
                    approvalHistory.GetValueOrDefault(user.Id, Array.Empty<DirectoryApprovalHistoryItem>()),
                    DirectoryAccountStatuses.FromUser(user, lockedSet.Contains(user.Id)));
            })
            .ToArray();

        return (items, totalCount);
    }

    public async Task<(IReadOnlyList<DirectoryCampusAdminResponse> Items, int TotalCount)> ListCampusAdminsAsync(
        int? schoolId,
        int? campusId,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Users.AsNoTracking()
            .Where(user => user.RoleAssignments.Any(assignment => assignment.Role == UserRole.CampusAdmin));

        if (schoolId is not null)
        {
            query = query.Where(user => user.SchoolId == schoolId.Value);
        }

        if (campusId is not null)
        {
            query = query.Where(user => user.CampusId == campusId.Value);
        }

        if (search.HasTrimmedText())
        {
            var term = search.AsTrimmedString();
            query = query.Where(user =>
                user.FullName.Contains(term)
                || user.Username.Contains(term)
                || (user.MobileNumber != null && user.MobileNumber.Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var users = await query
            .OrderBy(user => user.FullName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var schoolIds = users
            .Where(user => user.SchoolId.HasValue)
            .Select(user => (long)user.SchoolId!.Value)
            .Distinct()
            .ToArray();
        var campusIds = users
            .Where(user => user.CampusId.HasValue)
            .Select(user => (long)user.CampusId!.Value)
            .Distinct()
            .ToArray();

        var schoolNames = await _dbContext.Schools.AsNoTracking()
            .Where(school => schoolIds.Contains(school.Id) && !school.IsDeleted)
            .ToDictionaryAsync(school => school.Id, school => school.Name, cancellationToken);
        var campusNames = await _dbContext.Campuses.AsNoTracking()
            .Where(campus => campusIds.Contains(campus.Id) && !campus.IsDeleted)
            .ToDictionaryAsync(campus => campus.Id, campus => campus.Name, cancellationToken);

        var lockedSet = await GetLockedUserIdsAsync(
            users.Select(user => user.Id).ToArray(),
            cancellationToken);

        var campusIdKeys = users
            .Select(user => user.CampusId ?? 0)
            .Where(id => id > 0)
            .Distinct()
            .ToArray();
        var teacherCounts = await CountReadyUsersByCampusAsync(UserRole.Teacher, campusIdKeys, cancellationToken);
        var studentCounts = await CountReadyUsersByCampusAsync(UserRole.Student, campusIdKeys, cancellationToken);
        var approvalHistory = await GetApprovalHistoryByUserIdsAsync(
            users.Select(user => user.Id).ToArray(),
            cancellationToken);

        var items = users
            .Select(user =>
            {
                var sid = user.SchoolId ?? 0;
                var cid = user.CampusId ?? 0;
                return new DirectoryCampusAdminResponse(
                    user.Id,
                    user.FullName,
                    user.Username,
                    sid,
                    schoolNames.TryGetValue(sid, out var schoolName) ? schoolName : "—",
                    cid,
                    campusNames.TryGetValue(cid, out var campusName) ? campusName : "—",
                    user.MobileNumber,
                    user.Cnic,
                    user.EmailAddress,
                    user.IsActive,
                    user.NeedsPasswordSetup,
                    user.AvatarUrl,
                    teacherCounts.GetValueOrDefault(cid),
                    studentCounts.GetValueOrDefault(cid),
                    user.CreatedDate,
                    user.RequestedAt,
                    user.RejectedAt,
                    user.LastLoginAt,
                    user.ReasonMessage,
                    approvalHistory.GetValueOrDefault(user.Id, Array.Empty<DirectoryApprovalHistoryItem>()),
                    DirectoryAccountStatuses.FromUser(user, lockedSet.Contains(user.Id)));
            })
            .ToArray();

        return (items, totalCount);
    }

    public async Task<(IReadOnlyList<DirectoryCoordinatorResponse> Items, int TotalCount)> ListCoordinatorsAsync(
        int? schoolId,
        int? campusId,
        string? search,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Users.AsNoTracking()
            .Where(user => user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Coordinator));

        if (schoolId is not null)
        {
            query = query.Where(user => user.SchoolId == schoolId.Value);
        }

        if (campusId is not null)
        {
            query = query.Where(user => user.CampusId == campusId.Value);
        }

        if (search.HasTrimmedText())
        {
            var term = search.AsTrimmedString();
            query = query.Where(user =>
                user.FullName.Contains(term)
                || user.Username.Contains(term)
                || (user.RollNumberTeacherCode != null && user.RollNumberTeacherCode.Contains(term))
                || (user.MobileNumber != null && user.MobileNumber.Contains(term))
                || (user.EmailAddress != null && user.EmailAddress.Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var users = await query
            .OrderBy(user => user.FullName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var userIds = users.Select(user => user.Id).ToArray();
        var schoolIds = users
            .Where(user => user.SchoolId.HasValue)
            .Select(user => user.SchoolId!.Value)
            .Distinct()
            .ToArray();
        var campusIds = users
            .Where(user => user.CampusId.HasValue)
            .Select(user => user.CampusId!.Value)
            .Distinct()
            .ToArray();

        var schoolNames = await GetSchoolNamesAsync(schoolIds, cancellationToken);
        var campusNames = await GetCampusNamesAsync(campusIds, cancellationToken);
        var lockedSet = await GetLockedUserIdsAsync(userIds, cancellationToken);
        var approvalHistory = await GetApprovalHistoryByUserIdsAsync(userIds, cancellationToken);
        var rolesByUser = await GetRoleNamesByUserIdsAsync(userIds, cancellationToken);
        var classSectionsByUser = await GetCoordinatorClassSectionsAsync(userIds, cancellationToken);
        var studentsByCoordinator = await GetCoordinatorStudentsAsync(
            users.Select(user => (user.Id, user.SchoolId ?? 0, user.CampusId ?? 0)).ToArray(),
            classSectionsByUser,
            schoolNames,
            campusNames,
            cancellationToken);

        var items = users
            .Select(user =>
            {
                var sid = user.SchoolId ?? 0;
                var cid = user.CampusId ?? 0;
                var students = (IReadOnlyList<DirectoryLinkedStudentSummary>)studentsByCoordinator
                    .GetValueOrDefault(user.Id, Array.Empty<DirectoryLinkedStudentSummary>());
                return new DirectoryCoordinatorResponse(
                    user.Id,
                    user.FullName,
                    user.Username,
                    user.RollNumberTeacherCode ?? string.Empty,
                    sid,
                    schoolNames.GetValueOrDefault(sid, "—"),
                    cid,
                    campusNames.GetValueOrDefault(cid, "—"),
                    user.IsActive,
                    user.AvatarUrl,
                    user.MobileNumber,
                    user.Cnic,
                    user.EmailAddress,
                    user.CreatedDate,
                    user.RequestedAt,
                    user.RejectedAt,
                    user.LastLoginAt,
                    user.ReasonMessage,
                    user.NeedsPasswordSetup,
                    DirectoryAccountStatuses.FromUser(user, lockedSet.Contains(user.Id)),
                    approvalHistory.GetValueOrDefault(user.Id, Array.Empty<DirectoryApprovalHistoryItem>()),
                    rolesByUser.GetValueOrDefault(user.Id, Array.Empty<string>()),
                    classSectionsByUser.GetValueOrDefault(user.Id, Array.Empty<CoordinatorClassSectionItem>()),
                    students.Count,
                    students);
            })
            .ToArray();

        return (items, totalCount);
    }

    private async Task<Dictionary<long, IReadOnlyList<CoordinatorClassSectionItem>>> GetCoordinatorClassSectionsAsync(
        IReadOnlyList<long> userIds,
        CancellationToken cancellationToken)
    {
        if (userIds.Count == 0)
        {
            return new Dictionary<long, IReadOnlyList<CoordinatorClassSectionItem>>();
        }

        var rows = await _dbContext.CoordinatorClassSections.AsNoTracking()
            .Where(item => userIds.Contains(item.CoordinatorUserId) && item.IsActive)
            .Select(item => new { item.CoordinatorUserId, item.Grade })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(row => row.CoordinatorUserId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<CoordinatorClassSectionItem>)group
                    .Select(row => row.Grade)
                    .Distinct()
                    .OrderBy(grade => grade)
                    .Select(grade => new CoordinatorClassSectionItem(grade))
                    .ToArray());
    }

    private async Task<Dictionary<int, string>> GetSchoolNamesAsync(
        IReadOnlyList<int> schoolIds,
        CancellationToken cancellationToken)
    {
        if (schoolIds.Count == 0)
        {
            return new Dictionary<int, string>();
        }

        var ids = schoolIds.Select(id => (long)id).ToArray();
        return await _dbContext.Schools.AsNoTracking()
            .Where(school => ids.Contains(school.Id) && !school.IsDeleted)
            .ToDictionaryAsync(school => (int)school.Id, school => school.Name, cancellationToken);
    }

    private async Task<Dictionary<int, string>> GetCampusNamesAsync(
        IReadOnlyList<int> campusIds,
        CancellationToken cancellationToken)
    {
        if (campusIds.Count == 0)
        {
            return new Dictionary<int, string>();
        }

        var ids = campusIds.Select(id => (long)id).ToArray();
        return await _dbContext.Campuses.AsNoTracking()
            .Where(campus => ids.Contains(campus.Id) && !campus.IsDeleted)
            .ToDictionaryAsync(campus => (int)campus.Id, campus => campus.Name, cancellationToken);
    }

    private async Task<Dictionary<int, int>> CountActiveCampusesBySchoolAsync(
        IReadOnlyList<int> schoolIds,
        CancellationToken cancellationToken)
    {
        if (schoolIds.Count == 0)
        {
            return new Dictionary<int, int>();
        }

        return await _dbContext.Campuses.AsNoTracking()
            .Where(campus => schoolIds.Contains(campus.SchoolId) && !campus.IsDeleted && campus.IsActive)
            .GroupBy(campus => campus.SchoolId)
            .Select(group => new { SchoolId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.SchoolId, item => item.Count, cancellationToken);
    }

    private async Task<Dictionary<int, int>> CountReadyUsersBySchoolAsync(
        UserRole role,
        IReadOnlyList<int> schoolIds,
        CancellationToken cancellationToken)
    {
        if (schoolIds.Count == 0)
        {
            return new Dictionary<int, int>();
        }

        return await _dbContext.Users.AsNoTracking()
            .Where(user =>
                user.SchoolId != null
                && schoolIds.Contains(user.SchoolId.Value)
                && user.IsActive
                && user.RejectedAt == null
                && user.PasswordHash != null
                && user.PasswordHash != ""
                && user.RoleAssignments.Any(assignment => assignment.Role == role))
            .GroupBy(user => user.SchoolId!.Value)
            .Select(group => new { SchoolId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.SchoolId, item => item.Count, cancellationToken);
    }

    private async Task<Dictionary<int, int>> CountReadyUsersByCampusAsync(
        UserRole role,
        IReadOnlyList<int> campusIds,
        CancellationToken cancellationToken)
    {
        if (campusIds.Count == 0)
        {
            return new Dictionary<int, int>();
        }

        return await _dbContext.Users.AsNoTracking()
            .Where(user =>
                user.CampusId != null
                && campusIds.Contains(user.CampusId.Value)
                && user.IsActive
                && user.RejectedAt == null
                && user.PasswordHash != null
                && user.PasswordHash != ""
                && user.RoleAssignments.Any(assignment => assignment.Role == role))
            .GroupBy(user => user.CampusId!.Value)
            .Select(group => new { CampusId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.CampusId, item => item.Count, cancellationToken);
    }

    private async Task<Dictionary<long, IReadOnlyList<DirectoryLinkedStudentSummary>>> GetTeacherStudentsAsync(
        IReadOnlyList<(long TeacherId, int SchoolId, int CampusId)> teachers,
        IReadOnlyDictionary<int, string> schoolNames,
        IReadOnlyDictionary<int, string> campusNames,
        CancellationToken cancellationToken)
    {
        var result = teachers.ToDictionary(
            item => item.TeacherId,
            _ => (IReadOnlyList<DirectoryLinkedStudentSummary>)Array.Empty<DirectoryLinkedStudentSummary>());

        if (teachers.Count == 0)
        {
            return result;
        }

        var teacherIds = teachers.Select(item => item.TeacherId).ToArray();
        var assignments = await _dbContext.TeacherClassSections.AsNoTracking()
            .Where(item => teacherIds.Contains(item.TeacherId) && item.IsActive)
            .Select(item => new { item.TeacherId, item.Grade, item.Section })
            .ToListAsync(cancellationToken);

        foreach (var teacher in teachers)
        {
            if (teacher.SchoolId <= 0 || teacher.CampusId <= 0)
            {
                continue;
            }

            var sections = assignments
                .Where(item => item.TeacherId == teacher.TeacherId)
                .Select(item => (item.Grade, Section: item.Section.ToLowerInvariant()))
                .ToHashSet();
            if (sections.Count == 0)
            {
                continue;
            }

            var grades = sections.Select(item => item.Grade).Distinct().ToArray();
            var sectionNames = sections.Select(item => item.Section).Distinct().ToArray();

            var candidates = await (
                from student in _dbContext.Students.AsNoTracking()
                join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
                where user.SchoolId == teacher.SchoolId
                    && user.CampusId == teacher.CampusId
                    && user.IsActive
                    && user.RejectedAt == null
                    && user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Student)
                    && grades.Contains(student.Grade)
                    && sectionNames.Contains(student.Section.ToLower())
                orderby student.Grade, student.Section, user.FullName
                select new
                {
                    student.Id,
                    user.FullName,
                    user.Username,
                    user.AvatarUrl,
                    student.Grade,
                    student.Section,
                    user.IsActive,
                    HasPassword = user.PasswordHash != null && user.PasswordHash != "",
                })
                .ToListAsync(cancellationToken);

            var schoolName = schoolNames.GetValueOrDefault(teacher.SchoolId, "—");
            var campusName = campusNames.GetValueOrDefault(teacher.CampusId, "—");

            result[teacher.TeacherId] = candidates
                .Where(row => sections.Contains((row.Grade, row.Section.ToLowerInvariant())))
                .Select(row => new DirectoryLinkedStudentSummary(
                    row.Id,
                    row.FullName,
                    row.Username,
                    row.AvatarUrl,
                    schoolName,
                    campusName,
                    row.Grade,
                    row.Section,
                    row.IsActive,
                    DirectoryAccountStatuses.Resolve(
                        row.IsActive,
                        row.HasPassword,
                        isRejected: false,
                        isLockedPendingSchoolChange: false)))
                .ToArray();
        }

        return result;
    }

    private async Task<Dictionary<long, IReadOnlyList<DirectoryLinkedStudentSummary>>> GetCoordinatorStudentsAsync(
        IReadOnlyList<(long UserId, int SchoolId, int CampusId)> coordinators,
        IReadOnlyDictionary<long, IReadOnlyList<CoordinatorClassSectionItem>> classSectionsByUser,
        IReadOnlyDictionary<int, string> schoolNames,
        IReadOnlyDictionary<int, string> campusNames,
        CancellationToken cancellationToken)
    {
        var result = coordinators.ToDictionary(
            item => item.UserId,
            _ => (IReadOnlyList<DirectoryLinkedStudentSummary>)Array.Empty<DirectoryLinkedStudentSummary>());

        if (coordinators.Count == 0)
        {
            return result;
        }

        foreach (var coordinator in coordinators)
        {
            if (coordinator.SchoolId <= 0 || coordinator.CampusId <= 0)
            {
                continue;
            }

            var grades = (classSectionsByUser.GetValueOrDefault(
                    coordinator.UserId,
                    Array.Empty<CoordinatorClassSectionItem>()) ?? Array.Empty<CoordinatorClassSectionItem>())
                .Select(item => item.Grade)
                .Distinct()
                .ToArray();
            if (grades.Length == 0)
            {
                continue;
            }

            var rows = await (
                from student in _dbContext.Students.AsNoTracking()
                join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
                where user.SchoolId == coordinator.SchoolId
                    && user.CampusId == coordinator.CampusId
                    && user.IsActive
                    && user.RejectedAt == null
                    && user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Student)
                    && grades.Contains(student.Grade)
                orderby student.Grade, student.Section, user.FullName
                select new
                {
                    student.Id,
                    user.FullName,
                    user.Username,
                    user.AvatarUrl,
                    student.Grade,
                    student.Section,
                    user.IsActive,
                    HasPassword = user.PasswordHash != null && user.PasswordHash != "",
                })
                .ToListAsync(cancellationToken);

            var schoolName = schoolNames.GetValueOrDefault(coordinator.SchoolId, "—");
            var campusName = campusNames.GetValueOrDefault(coordinator.CampusId, "—");

            result[coordinator.UserId] = rows
                .Select(row => new DirectoryLinkedStudentSummary(
                    row.Id,
                    row.FullName,
                    row.Username,
                    row.AvatarUrl,
                    schoolName,
                    campusName,
                    row.Grade,
                    row.Section,
                    row.IsActive,
                    DirectoryAccountStatuses.Resolve(
                        row.IsActive,
                        row.HasPassword,
                        isRejected: false,
                        isLockedPendingSchoolChange: false)))
                .ToArray();
        }

        return result;
    }

    private async Task<Dictionary<long, IReadOnlyList<TeacherClassSectionItem>>> GetTeacherClassSectionsAsync(
        IReadOnlyList<long> teacherIds,
        CancellationToken cancellationToken)
    {
        if (teacherIds.Count == 0)
        {
            return new Dictionary<long, IReadOnlyList<TeacherClassSectionItem>>();
        }

        var rows = await _dbContext.TeacherClassSections.AsNoTracking()
            .Where(item => teacherIds.Contains(item.TeacherId) && item.IsActive)
            .OrderBy(item => item.Grade)
            .ThenBy(item => item.Section)
            .Select(item => new { item.TeacherId, item.Grade, item.Section })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(row => row.TeacherId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<TeacherClassSectionItem>)group
                    .Select(row => new TeacherClassSectionItem(row.Grade, row.Section))
                    .ToArray());
    }

    private async Task<Dictionary<long, IReadOnlyList<string>>> GetTeacherNamesByStudentAsync(
        IReadOnlyList<long> studentIds,
        CancellationToken cancellationToken)
    {
        if (studentIds.Count == 0)
        {
            return new Dictionary<long, IReadOnlyList<string>>();
        }

        var students = await (
            from student in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            where studentIds.Contains(student.Id)
            select new
            {
                student.Id,
                user.SchoolId,
                user.CampusId,
                student.Grade,
                student.Section,
            })
            .ToListAsync(cancellationToken);

        if (students.Count == 0)
        {
            return new Dictionary<long, IReadOnlyList<string>>();
        }

        var schoolIds = students.Where(s => s.SchoolId is not null).Select(s => s.SchoolId!.Value).Distinct().ToArray();
        var campusIds = students.Where(s => s.CampusId is not null).Select(s => s.CampusId!.Value).Distinct().ToArray();
        var grades = students.Select(s => s.Grade).Distinct().ToArray();

        var teachers = await (
            from assignment in _dbContext.TeacherClassSections.AsNoTracking()
            join teacherUser in _dbContext.Users.AsNoTracking() on assignment.TeacherId equals teacherUser.Id
            where assignment.IsActive
                && teacherUser.SchoolId != null
                && teacherUser.CampusId != null
                && schoolIds.Contains(teacherUser.SchoolId.Value)
                && campusIds.Contains(teacherUser.CampusId.Value)
                && grades.Contains(assignment.Grade)
                && teacherUser.RoleAssignments.Any(role => role.Role == UserRole.Teacher)
            select new
            {
                teacherUser.FullName,
                teacherUser.SchoolId,
                teacherUser.CampusId,
                assignment.Grade,
                assignment.Section,
            })
            .ToListAsync(cancellationToken);

        var result = new Dictionary<long, IReadOnlyList<string>>();
        foreach (var student in students)
        {
            if (student.SchoolId is null || student.CampusId is null)
            {
                result[student.Id] = Array.Empty<string>();
                continue;
            }

            result[student.Id] = teachers
                .Where(teacher =>
                    teacher.SchoolId == student.SchoolId
                    && teacher.CampusId == student.CampusId
                    && teacher.Grade == student.Grade
                    && string.Equals(teacher.Section, student.Section, StringComparison.OrdinalIgnoreCase))
                .Select(teacher => teacher.FullName)
                .Where(name => name.HasTrimmedText())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(name => name)
                .ToArray();
        }

        return result;
    }

    private async Task<Dictionary<long, IReadOnlyList<string>>> GetCoordinatorNamesByStudentAsync(
        IReadOnlyList<long> studentIds,
        CancellationToken cancellationToken)
    {
        if (studentIds.Count == 0)
        {
            return new Dictionary<long, IReadOnlyList<string>>();
        }

        var students = await (
            from student in _dbContext.Students.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
            where studentIds.Contains(student.Id)
            select new
            {
                student.Id,
                user.SchoolId,
                user.CampusId,
                student.Grade,
            })
            .ToListAsync(cancellationToken);

        if (students.Count == 0)
        {
            return new Dictionary<long, IReadOnlyList<string>>();
        }

        var schoolIds = students.Where(s => s.SchoolId is not null).Select(s => s.SchoolId!.Value).Distinct().ToArray();
        var campusIds = students.Where(s => s.CampusId is not null).Select(s => s.CampusId!.Value).Distinct().ToArray();
        var grades = students.Select(s => s.Grade).Distinct().ToArray();

        var coordinators = await (
            from assignment in _dbContext.CoordinatorClassSections.AsNoTracking()
            join coordinatorUser in _dbContext.Users.AsNoTracking()
                on assignment.CoordinatorUserId equals coordinatorUser.Id
            where assignment.IsActive
                && coordinatorUser.SchoolId != null
                && coordinatorUser.CampusId != null
                && schoolIds.Contains(coordinatorUser.SchoolId.Value)
                && campusIds.Contains(coordinatorUser.CampusId.Value)
                && grades.Contains(assignment.Grade)
                && coordinatorUser.RoleAssignments.Any(role => role.Role == UserRole.Coordinator)
            select new
            {
                coordinatorUser.FullName,
                coordinatorUser.SchoolId,
                coordinatorUser.CampusId,
                assignment.Grade,
            })
            .ToListAsync(cancellationToken);

        var result = new Dictionary<long, IReadOnlyList<string>>();
        foreach (var student in students)
        {
            if (student.SchoolId is null || student.CampusId is null)
            {
                result[student.Id] = Array.Empty<string>();
                continue;
            }

            result[student.Id] = coordinators
                .Where(coordinator =>
                    coordinator.SchoolId == student.SchoolId
                    && coordinator.CampusId == student.CampusId
                    && coordinator.Grade == student.Grade)
                .Select(coordinator => coordinator.FullName)
                .Where(name => name.HasTrimmedText())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(name => name)
                .ToArray();
        }

        return result;
    }

    private async Task<Dictionary<long, IReadOnlyList<string>>> GetParentNamesByStudentAsync(
        IReadOnlyList<long> studentIds,
        CancellationToken cancellationToken)
    {
        if (studentIds.Count == 0)
        {
            return new Dictionary<long, IReadOnlyList<string>>();
        }

        var rows = await (
            from relation in _dbContext.ParentStudentRelations.AsNoTracking()
            join parentUser in _dbContext.Users.AsNoTracking() on relation.ParentId equals parentUser.Id
            where studentIds.Contains(relation.StudentId) && relation.IsActive
            select new { relation.StudentId, parentUser.FullName })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(row => row.StudentId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<string>)group
                    .Select(row => row.FullName)
                    .Where(name => name.HasTrimmedText())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(name => name)
                    .ToArray());
    }

    private async Task<Dictionary<long, IReadOnlyList<string>>> GetTutorNamesByStudentAsync(
        IReadOnlyList<long> studentIds,
        CancellationToken cancellationToken)
    {
        if (studentIds.Count == 0)
        {
            return new Dictionary<long, IReadOnlyList<string>>();
        }

        var rows = await (
            from relation in _dbContext.TutorStudentRelations.AsNoTracking()
            join tutorUser in _dbContext.Users.AsNoTracking() on relation.TutorId equals tutorUser.Id
            where studentIds.Contains(relation.StudentId) && relation.IsActive
            select new { relation.StudentId, tutorUser.FullName })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(row => row.StudentId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<string>)group
                    .Select(row => row.FullName)
                    .Where(name => name.HasTrimmedText())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(name => name)
                    .ToArray());
    }

    private async Task<HashSet<long>> GetLockedUserIdsAsync(
        IReadOnlyList<long> userIds,
        CancellationToken cancellationToken)
    {
        if (userIds.Count == 0)
        {
            return [];
        }

        var pendingChange = SchoolChangeRequestStatus.Pending;
        var lockedIds = await _dbContext.UserSchoolChangeRequests.AsNoTracking()
            .Where(request =>
                request.Status == pendingChange && userIds.Contains(request.UserId))
            .Select(request => request.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        return lockedIds.ToHashSet();
    }

    public async Task<DirectorySchoolStatusCounts> CountSchoolsByStatusAsync(
        int? schoolId,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Schools.AsNoTracking()
            .Where(school => !school.IsDeleted);

        if (schoolId is not null)
        {
            query = query.Where(school => school.Id == schoolId.Value);
        }

        var active = await query.CountAsync(school => school.IsActive, cancellationToken);
        var inactive = await query.CountAsync(school => !school.IsActive, cancellationToken);
        return new DirectorySchoolStatusCounts(active, inactive, active + inactive);
    }

    public async Task<DirectoryStatusCounts> CountUsersByStatusAsync(
        UserRole role,
        int? schoolId,
        int? campusId,
        CancellationToken cancellationToken)
    {
        // Count by role assignment on app_users so pending registrations
        // (no Student/Teacher/Parent profile yet) are included in totals.
        var users = _dbContext.Users.AsNoTracking()
            .Where(user => user.RoleAssignments.Any(assignment => assignment.Role == role));

        if (schoolId is not null)
        {
            users = users.Where(user => user.SchoolId == schoolId.Value);
        }

        if (campusId is not null)
        {
            users = users.Where(user => user.CampusId == campusId.Value);
        }

        var pendingChange = SchoolChangeRequestStatus.Pending;

        var rows = await users
            .Select(user => new
            {
                user.Id,
                user.IsActive,
                user.PasswordHash,
                user.RejectedAt,
            })
            .ToListAsync(cancellationToken);

        if (rows.Count == 0)
        {
            return new DirectoryStatusCounts(0, 0, 0, 0, 0, 0, 0, 0);
        }

        var userIds = rows.Select(row => row.Id).ToArray();
        var lockedUserIds = await _dbContext.UserSchoolChangeRequests.AsNoTracking()
            .Where(request =>
                request.Status == pendingChange && userIds.Contains(request.UserId))
            .Select(request => request.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);
        var lockedSet = lockedUserIds.ToHashSet();

        var activeReady = 0;
        var pendingApproval = 0;
        var needsPasswordSetup = 0;
        var locked = 0;
        var deactivated = 0;
        var rejected = 0;

        foreach (var row in rows)
        {
            var hasPassword = !string.IsNullOrWhiteSpace(row.PasswordHash);

            if (row.RejectedAt is not null)
            {
                rejected++;
                continue;
            }

            if (row.IsActive && !hasPassword)
            {
                needsPasswordSetup++;
                continue;
            }

            if (row.IsActive && hasPassword)
            {
                activeReady++;
                continue;
            }

            if (!hasPassword)
            {
                pendingApproval++;
                continue;
            }

            if (lockedSet.Contains(row.Id))
            {
                locked++;
            }
            else
            {
                deactivated++;
            }
        }

        // Align with QA login-status states (mutually exclusive):
        // Active = Ready only (is_active + password set). NeedsPasswordSetup is separate.
        var active = activeReady;
        var total = activeReady + pendingApproval + needsPasswordSetup + locked + deactivated + rejected;
        return new DirectoryStatusCounts(
            active,
            activeReady,
            pendingApproval,
            needsPasswordSetup,
            locked,
            deactivated,
            rejected,
            total);
    }

    public async Task<DirectoryStatusCounts> CountParentsLinkedToStudentsByStatusAsync(
        int? schoolId,
        int? campusId,
        CancellationToken cancellationToken)
    {
        // Portal Admin: all parents (same buckets as CountUsersByStatusAsync for Parent).
        if (schoolId is null)
        {
            return await CountUsersByStatusAsync(
                UserRole.Parent,
                schoolId: null,
                campusId: null,
                cancellationToken);
        }

        var scopedStudentIds = ScopedStudentIdsQuery(schoolId.Value, campusId);
        var parentIds = await _dbContext.ParentStudentRelations.AsNoTracking()
            .Where(relation =>
                relation.IsActive && scopedStudentIds.Contains(relation.StudentId))
            .Select(relation => relation.ParentId)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (parentIds.Count == 0)
        {
            return new DirectoryStatusCounts(0, 0, 0, 0, 0, 0, 0, 0);
        }

        var pendingChange = SchoolChangeRequestStatus.Pending;
        var rows = await _dbContext.Users.AsNoTracking()
            .Where(user =>
                parentIds.Contains(user.Id)
                && user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Parent))
            .Select(user => new
            {
                user.Id,
                user.IsActive,
                user.PasswordHash,
                user.RejectedAt,
            })
            .ToListAsync(cancellationToken);

        if (rows.Count == 0)
        {
            return new DirectoryStatusCounts(0, 0, 0, 0, 0, 0, 0, 0);
        }

        var userIds = rows.Select(row => row.Id).ToArray();
        var lockedUserIds = await _dbContext.UserSchoolChangeRequests.AsNoTracking()
            .Where(request =>
                request.Status == pendingChange && userIds.Contains(request.UserId))
            .Select(request => request.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);
        var lockedSet = lockedUserIds.ToHashSet();

        var activeReady = 0;
        var pendingApproval = 0;
        var needsPasswordSetup = 0;
        var locked = 0;
        var deactivated = 0;
        var rejected = 0;

        foreach (var row in rows)
        {
            var hasPassword = !string.IsNullOrWhiteSpace(row.PasswordHash);

            if (row.RejectedAt is not null)
            {
                rejected++;
                continue;
            }

            if (row.IsActive && !hasPassword)
            {
                needsPasswordSetup++;
                continue;
            }

            if (row.IsActive && hasPassword)
            {
                activeReady++;
                continue;
            }

            if (!hasPassword)
            {
                pendingApproval++;
                continue;
            }

            if (lockedSet.Contains(row.Id))
            {
                locked++;
            }
            else
            {
                deactivated++;
            }
        }

        var active = activeReady;
        var total = activeReady + pendingApproval + needsPasswordSetup + locked + deactivated + rejected;
        return new DirectoryStatusCounts(
            active,
            activeReady,
            pendingApproval,
            needsPasswordSetup,
            locked,
            deactivated,
            rejected,
            total);
    }

    private IQueryable<long> ScopedStudentIdsQuery(int schoolId, int? campusId)
    {
        var students = _dbContext.Users.AsNoTracking()
            .Where(user =>
                user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Student)
                && user.SchoolId == schoolId);

        if (campusId is not null)
        {
            students = students.Where(user => user.CampusId == campusId.Value);
        }

        return students.Select(user => user.Id);
    }

    private async Task<Dictionary<long, IReadOnlyList<string>>> GetRoleNamesByUserIdsAsync(
        IReadOnlyList<long> userIds,
        CancellationToken cancellationToken)
    {
        if (userIds.Count == 0)
        {
            return new Dictionary<long, IReadOnlyList<string>>();
        }

        var rows = await _dbContext.UserRoleAssignments.AsNoTracking()
            .Where(assignment => userIds.Contains(assignment.UserId))
            .Select(assignment => new { assignment.UserId, assignment.Role })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(row => row.UserId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<string>)group
                    .OrderBy(row => row.Role)
                    .Select(row => row.Role.ToString())
                    .ToArray());
    }

    private async Task<Dictionary<long, IReadOnlyList<DirectoryApprovalHistoryItem>>> GetApprovalHistoryByUserIdsAsync(
        IReadOnlyList<long> userIds,
        CancellationToken cancellationToken)
    {
        if (userIds.Count == 0)
        {
            return new Dictionary<long, IReadOnlyList<DirectoryApprovalHistoryItem>>();
        }

        var rows = await (
            from approval in _dbContext.Approvals.AsNoTracking()
            join admin in _dbContext.Users.AsNoTracking() on approval.ApprovedByUserId equals admin.Id
            where approval.EntityType == ApprovalEntityType.User
                && approval.UserId != null
                && userIds.Contains(approval.UserId.Value)
            orderby approval.ApprovedAt descending, approval.Id descending
            select new
            {
                UserId = approval.UserId.Value,
                approval.ApprovedByUserId,
                ApproverName = admin.FullName,
                approval.ApprovedByRole,
                approval.IsApproved,
                approval.ApprovedAt,
            }
        ).ToListAsync(cancellationToken);

        return rows
            .GroupBy(row => row.UserId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<DirectoryApprovalHistoryItem>)group
                    .Select(row => new DirectoryApprovalHistoryItem(
                        row.ApprovedByUserId,
                        row.ApproverName,
                        FormatApproverRole(row.ApprovedByRole),
                        FormatApprovalDecision(row.IsApproved),
                        row.ApprovedAt))
                    .ToArray());
    }

    private static string FormatApproverRole(UserRole role)
        => role switch
        {
            UserRole.PortalAdmin => "Portal Admin",
            UserRole.SchoolAdmin => "School Admin",
            UserRole.CampusAdmin => "Campus Admin",
            UserRole.Teacher => "Teacher",
            UserRole.Parent => "Parent",
            UserRole.Student => "Student",
            _ => role.ToString(),
        };

    private static string FormatApprovalDecision(bool? isApproved)
        => isApproved switch
        {
            true => "Approved",
            false => "Rejected",
            null => "Pending",
        };

    private IQueryable<User> BuildUserQueryForRole(UserRole role)
    {
        return role switch
        {
            UserRole.Student =>
                from student in _dbContext.Students.AsNoTracking()
                join user in _dbContext.Users.AsNoTracking() on student.Id equals user.Id
                where user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Student)
                select user,

            UserRole.Teacher =>
                from teacher in _dbContext.Teachers.AsNoTracking()
                join user in _dbContext.Users.AsNoTracking() on teacher.Id equals user.Id
                where user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Teacher)
                select user,

            UserRole.Parent =>
                from parent in _dbContext.Parents.AsNoTracking()
                join user in _dbContext.Users.AsNoTracking() on parent.Id equals user.Id
                where user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Parent)
                select user,

            UserRole.Tutor =>
                from tutor in _dbContext.Tutors.AsNoTracking()
                join user in _dbContext.Users.AsNoTracking() on tutor.Id equals user.Id
                where user.RoleAssignments.Any(assignment => assignment.Role == UserRole.Tutor)
                select user,

            _ => _dbContext.Users.AsNoTracking()
                .Where(user => user.RoleAssignments.Any(assignment => assignment.Role == role)),
        };
    }
}
