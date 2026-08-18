using Microsoft.EntityFrameworkCore;
using RankUpEducation.Application.Common.Abstractions;
using RankUpEducation.Domain.Approvals;
using RankUpEducation.Domain.Auth;
using RankUpEducation.Domain.Questions;

namespace RankUpEducation.Infrastructure.Persistence.Repositories;

/// <summary>EF Core implementation of <see cref="IQuestionEditRequestRepository"/>.</summary>
public sealed class QuestionEditRequestRepository : IQuestionEditRequestRepository
{
    private readonly RankUpDbContext _dbContext;

    public QuestionEditRequestRepository(RankUpDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(QuestionEditRequest request, CancellationToken cancellationToken)
    {
        await _dbContext.QuestionEditRequests.AddAsync(request, cancellationToken);
    }

    public async Task AddApprovalsAsync(
        IEnumerable<Approval> approvals,
        CancellationToken cancellationToken)
    {
        await _dbContext.Approvals.AddRangeAsync(approvals, cancellationToken);
    }

    public Task<QuestionEditRequest?> GetByIdAsync(
        long requestId,
        CancellationToken cancellationToken)
    {
        return _dbContext.QuestionEditRequests
            .FirstOrDefaultAsync(request => request.Id == requestId, cancellationToken);
    }

    public Task<QuestionEditRequest?> GetPendingForUserAsync(
        long questionId,
        long requestedByUserId,
        CancellationToken cancellationToken)
    {
        return _dbContext.QuestionEditRequests.FirstOrDefaultAsync(
            request =>
                request.QuestionId == questionId
                && request.RequestedByUserId == requestedByUserId
                && request.Status == QuestionEditRequestStatus.Pending,
            cancellationToken);
    }

    public Task<QuestionEditRequest?> GetUnusedGrantAsync(
        long questionId,
        long requestedByUserId,
        CancellationToken cancellationToken)
    {
        return _dbContext.QuestionEditRequests.FirstOrDefaultAsync(
            request =>
                request.QuestionId == questionId
                && request.RequestedByUserId == requestedByUserId
                && request.Status == QuestionEditRequestStatus.Approved
                && request.EditUsedAt == null,
            cancellationToken);
    }

    public Task<QuestionEditRequest?> GetLatestForUserAsync(
        long questionId,
        long requestedByUserId,
        CancellationToken cancellationToken)
    {
        return _dbContext.QuestionEditRequests
            .Where(request =>
                request.QuestionId == questionId
                && request.RequestedByUserId == requestedByUserId)
            .OrderByDescending(request => request.RequestedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<QuestionEditRequest>> ListPendingForQuestionAsync(
        long questionId,
        CancellationToken cancellationToken)
    {
        return await _dbContext.QuestionEditRequests
            .Where(request =>
                request.QuestionId == questionId
                && request.Status == QuestionEditRequestStatus.Pending)
            .OrderByDescending(request => request.RequestedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<QuestionEditRequestQueueRow>> ListPendingQueueAsync(
        CancellationToken cancellationToken)
    {
        return await (
            from request in _dbContext.QuestionEditRequests.AsNoTracking()
            join question in _dbContext.Questions.AsNoTracking()
                on request.QuestionId equals question.Id
            join user in _dbContext.Users.AsNoTracking()
                on request.RequestedByUserId equals user.Id
            where request.Status == QuestionEditRequestStatus.Pending
            orderby request.RequestedAt descending
            select new QuestionEditRequestQueueRow(
                request.Id,
                request.QuestionId,
                question.QuestionText,
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
                approval.EntityType == ApprovalEntityType.QuestionEditRequest
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
                approval.EntityType == ApprovalEntityType.QuestionEditRequest
                && approval.RequestId == requestId
                && approval.IsApproved == null
                && approval.ApprovedAt == null)
            .ToListAsync(cancellationToken);
    }

    public async Task CancelPendingForQuestionAsync(
        long questionId,
        DateTimeOffset resolvedAt,
        long? exceptRequestId,
        string? decisionReason,
        CancellationToken cancellationToken)
    {
        var pending = await _dbContext.QuestionEditRequests
            .Where(request =>
                request.QuestionId == questionId
                && request.Status == QuestionEditRequestStatus.Pending
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
                approval.EntityType == ApprovalEntityType.QuestionEditRequest
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

    public async Task RemoveForQuestionAsync(long questionId, CancellationToken cancellationToken)
    {
        var requests = await _dbContext.QuestionEditRequests
            .Where(request => request.QuestionId == questionId)
            .ToListAsync(cancellationToken);

        if (requests.Count == 0)
        {
            return;
        }

        var requestIds = requests.Select(request => request.Id).ToArray();
        var approvals = await _dbContext.Approvals
            .Where(approval =>
                approval.EntityType == ApprovalEntityType.QuestionEditRequest
                && approval.RequestId != null
                && requestIds.Contains(approval.RequestId.Value))
            .ToListAsync(cancellationToken);

        _dbContext.Approvals.RemoveRange(approvals);
        _dbContext.QuestionEditRequests.RemoveRange(requests);
    }
}
