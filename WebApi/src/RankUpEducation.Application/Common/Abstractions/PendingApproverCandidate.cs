using RankUpEducation.Domain.Auth;

namespace RankUpEducation.Application.Common.Abstractions;

public sealed record PendingApproverCandidate(
    long UserId,
    string FullName,
    string Username,
    UserRole Role);
