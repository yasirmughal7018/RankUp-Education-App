namespace RankUpEducation.Contracts.Parents;

public sealed record LinkedStudentResponse(
    long StudentId,
    string FullName,
    string RollNumber,
    short Grade,
    string Section,
    string Relationship);

public sealed record LinkedStudentListResponse(IReadOnlyList<LinkedStudentResponse> Items);
