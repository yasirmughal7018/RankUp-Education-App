namespace RankUpEducation.Application.Directory;

/// <summary>One assigned person with optional context for the student self-view.</summary>
public sealed record StudentAssignedPerson(string FullName, string? Detail);

/// <summary>People linked or assigned to a student.</summary>
public sealed record StudentAssignedPeople(
    IReadOnlyList<StudentAssignedPerson> Parents,
    IReadOnlyList<StudentAssignedPerson> Coordinators,
    IReadOnlyList<StudentAssignedPerson> Teachers);
