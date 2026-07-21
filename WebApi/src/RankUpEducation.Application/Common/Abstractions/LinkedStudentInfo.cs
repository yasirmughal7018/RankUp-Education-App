namespace RankUpEducation.Application.Common.Abstractions;

/// <summary>Student linked to a parent account for scoped parent and report access.</summary>
public sealed record LinkedStudentInfo(
    long StudentId,
    string FullName,
    string RollNumber,
    short Grade,
    string Section,
    string Relationship);
