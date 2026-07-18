namespace RankUpEducation.Contracts.Attendance;

public sealed record AttendanceRecordResponse(
    long Id,
    long StudentId,
    string StudentName,
    DateOnly Date,
    string Status,
    string? Notes);

public sealed record AttendanceListResponse(IReadOnlyList<AttendanceRecordResponse> Items);
