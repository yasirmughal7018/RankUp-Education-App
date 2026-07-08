namespace RankUpEducation.Application.Common.Abstractions;

public sealed record LinkedStudentInfo(
    long StudentId,
    string FullName,
    string RollNumber,
    short Grade,
    string Section,
    string Relationship);
