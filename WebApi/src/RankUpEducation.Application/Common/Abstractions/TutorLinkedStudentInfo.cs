namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>Student linked to a tutor account for tuition quizzes and reports.</summary>
public sealed record TutorLinkedStudentInfo(
    long StudentId,
    string FullName,
    string Username,
    string RollNumber,
    short Grade,
    string Section,
    string? SchoolName);
