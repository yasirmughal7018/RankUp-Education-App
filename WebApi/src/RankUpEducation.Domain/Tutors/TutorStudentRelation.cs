using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Tutors;

public sealed class TutorStudentRelation : BaseEntity
{
    private TutorStudentRelation()
    {
    }

    public TutorStudentRelation(long tutorId, long studentId)
    {
        TutorId = tutorId;
        StudentId = studentId;
    }

    public long TutorId { get; private set; }
    public long StudentId { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateOnly CreatedDate { get; private set; } = DateOnly.FromDateTime(DateTime.UtcNow);

    public void Activate()
    {
        IsActive = true;
    }

    public void Deactivate()
    {
        IsActive = false;
    }
}
