using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Domain.Approvals;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Quizzes;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

/// <summary>EF Core implementation of <see cref="IQuizEditRequestRepository"/>.</summary>
public sealed class QuizEditRequestRepository : IQuizEditRequestRepository
{
    private readonly RankUpDbContext _dbContext;

    public QuizEditRequestRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(QuizEditRequest request, CancellationToken cancellationToken)
    {
        await _dbContext.QuizEditRequests.AddAsync(request, cancellationToken);
    }

    public async Task AddApprovalsAsync(
        IEnumerable<Approval> approvals,
        CancellationToken cancellationToken)
    {
        await _dbContext.Approvals.AddRangeAsync(approvals, cancellationToken);
    }

    public Task<QuizEditRequest?> GetByIdAsync(
        long requestId,
        CancellationToken cancellationToken)
    {
        return _dbContext.QuizEditRequests
            .FirstOrDefaultAsync(request => request.Id == requestId, cancellationToken);
    }

    public Task<QuizEditRequest?> GetPendingForUserAsync(
        long quizId,
        long requestedByUserId,
        CancellationToken cancellationToken)
    {
        return _dbContext.QuizEditRequests.FirstOrDefaultAsync(
            request =>
                request.QuizId == quizId
                && request.RequestedByUserId == requestedByUserId
                && request.Status == QuizEditRequestStatus.Pending,
            cancellationToken);
    }

    public Task<QuizEditRequest?> GetUnusedGrantAsync(
        long quizId,
        long requestedByUserId,
        CancellationToken cancellationToken)
    {
        return _dbContext.QuizEditRequests.FirstOrDefaultAsync(
            request =>
                request.QuizId == quizId
                && request.RequestedByUserId == requestedByUserId
                && request.Status == QuizEditRequestStatus.Approved
                && request.EditUsedAt == null,
            cancellationToken);
    }

    public Task<QuizEditRequest?> GetLatestForUserAsync(
        long quizId,
        long requestedByUserId,
        CancellationToken cancellationToken)
    {
        return _dbContext.QuizEditRequests
            .Where(request =>
                request.QuizId == quizId
                && request.RequestedByUserId == requestedByUserId)
            .OrderByDescending(request => request.RequestedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<QuizEditRequest>> ListPendingForQuizAsync(
        long quizId,
        CancellationToken cancellationToken)
    {
        return await _dbContext.QuizEditRequests
            .Where(request =>
                request.QuizId == quizId
                && request.Status == QuizEditRequestStatus.Pending)
            .OrderByDescending(request => request.RequestedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<QuizEditRequestQueueRow>> ListPendingQueueAsync(
        long approverUserId,
        UserRole approverRole,
        CancellationToken cancellationToken)
    {
        return await (
            from request in _dbContext.QuizEditRequests.AsNoTracking()
            join quiz in _dbContext.Quizzes.AsNoTracking() on request.QuizId equals quiz.Id
            join user in _dbContext.Users.AsNoTracking() on request.RequestedByUserId equals user.Id
            join approval in _dbContext.Approvals.AsNoTracking()
                on request.Id equals approval.RequestId
            where request.Status == QuizEditRequestStatus.Pending
                && approval.EntityType == ApprovalEntityType.QuizEditRequest
                && approval.ApprovedByUserId == approverUserId
                && approval.ApprovedByRole == approverRole
                && approval.IsApproved == null
                && approval.ApprovedAt == null
            orderby request.RequestedAt descending
            select new QuizEditRequestQueueRow(
                request.Id,
                request.QuizId,
                quiz.QuizTitle,
                request.RequestedByUserId,
                user.FullName,
                request.RequestedByRole,
                request.Reason,
                request.RequestedAt))
            .ToListAsync(cancellationToken);
    }

    public Task<Approval?> GetPendingApprovalAsync(
        long requestId,
        long approverUserId,
        UserRole approverRole,
        CancellationToken cancellationToken)
    {
        return _dbContext.Approvals.FirstOrDefaultAsync(
            approval =>
                approval.EntityType == ApprovalEntityType.QuizEditRequest
                && approval.RequestId == requestId
                && approval.ApprovedByUserId == approverUserId
                && approval.ApprovedByRole == approverRole
                && approval.IsApproved == null
                && approval.ApprovedAt == null,
            cancellationToken);
    }

    public async Task<IReadOnlyList<Approval>> ListPendingApprovalsAsync(
        long requestId,
        CancellationToken cancellationToken)
    {
        return await _dbContext.Approvals
            .Where(approval =>
                approval.EntityType == ApprovalEntityType.QuizEditRequest
                && approval.RequestId == requestId
                && approval.IsApproved == null
                && approval.ApprovedAt == null)
            .ToListAsync(cancellationToken);
    }

    public async Task CancelPendingForQuizAsync(
        long quizId,
        DateTimeOffset resolvedAt,
        long? exceptRequestId,
        string? decisionReason,
        CancellationToken cancellationToken)
    {
        var pending = await _dbContext.QuizEditRequests
            .Where(request =>
                request.QuizId == quizId
                && request.Status == QuizEditRequestStatus.Pending
                && (exceptRequestId == null || request.Id != exceptRequestId.Value))
            .ToListAsync(cancellationToken);

        if (pending.Count == 0)
        {
            return;
        }

        foreach (var request in pending)
        {
            request.Cancel(resolvedAt, decisionReason);
        }

        var requestIds = pending.Select(request => request.Id).ToArray();
        var approvals = await _dbContext.Approvals
            .Where(approval =>
                approval.EntityType == ApprovalEntityType.QuizEditRequest
                && approval.RequestId != null
                && requestIds.Contains(approval.RequestId.Value)
                && approval.IsApproved == null
                && approval.ApprovedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var approval in approvals)
        {
            approval.MarkRejected(resolvedAt, decisionReason);
        }
    }
}
