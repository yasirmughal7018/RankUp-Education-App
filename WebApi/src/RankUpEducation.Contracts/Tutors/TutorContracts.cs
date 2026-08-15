namespace RankUpEducation.Contracts.Tutors;

public sealed record TutorLinkedStudentResponse(
    long StudentId,
    string FullName,
    string Username,
    string RollNumber,
    short Grade,
    string Section,
    string? SchoolName);

public sealed record TutorLinkedStudentListResponse(
    IReadOnlyList<TutorLinkedStudentResponse> Items);

public sealed record LinkTutorStudentRequest(string Identifier);

public sealed record LinkTutorStudentResponse(
    long StudentId,
    string FullName,
    string Username,
    string RollNumber,
    short Grade,
    string Section,
    string? SchoolName,
    bool AlreadyLinked);
