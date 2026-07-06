namespace RankUpEducation.Application.Common.Abstractions;

public interface ICurrentUserService
{
    long? UserId { get; }
    string? Role { get; }
    long? ProfileId { get; }
    int? SchoolId { get; }
    int? CampusId { get; }
}
