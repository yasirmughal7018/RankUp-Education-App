using RankUpEducation.Contracts.Tutors;

namespace RankUpEducation.Application.Tutors;

public interface ITutorService
{
    Task<TutorLinkedStudentListResponse> ListLinkedStudentsAsync(CancellationToken cancellationToken);

    /// <summary>Links an existing active student to the signed-in tutor by CNIC or username.</summary>
    Task<LinkTutorStudentResponse> LinkStudentAsync(
        LinkTutorStudentRequest request,
        CancellationToken cancellationToken);

    /// <summary>Removes the tutor's access to a previously linked student.</summary>
    Task UnlinkStudentAsync(long studentId, CancellationToken cancellationToken);
}
