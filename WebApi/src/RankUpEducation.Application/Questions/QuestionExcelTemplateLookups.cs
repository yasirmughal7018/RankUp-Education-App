namespace RankUpEducation.Application.Questions;

/// <summary>Topics grouped under a subject for dependent Excel dropdowns.</summary>
public sealed record QuestionExcelTemplateTopicGroup(
    string SubjectName,
    short SubjectId,
    IReadOnlyList<string> TopicNames);

/// <summary>Lookup display values embedded in the downloadable question import template.</summary>
public sealed record QuestionExcelTemplateLookups(
    IReadOnlyList<string> QuestionTypes,
    IReadOnlyList<string> Classes,
    IReadOnlyList<string> Subjects,
    IReadOnlyList<QuestionExcelTemplateTopicGroup> TopicsBySubject,
    IReadOnlyList<string> DifficultyLevels)
{
    private static readonly string[] DefaultQuestionTypes =
    [
        "Single Choice",
        "Multiple Choice",
        "True/False",
        "Fill in the Blanks",
        "Descriptive",
        "Matching",
        "Ordering"
    ];

    private static readonly string[] DefaultDifficultyLevels = ["Easy", "Medium", "Hard"];

    /// <summary>Fallback when template is built without database lookups.</summary>
    public static QuestionExcelTemplateLookups CreateDefault()
        => new(
            DefaultQuestionTypes,
            [],
            ["Mathematics"],
            [new QuestionExcelTemplateTopicGroup("Mathematics", 0, ["Algebra", "Geometry"])],
            DefaultDifficultyLevels);
}
