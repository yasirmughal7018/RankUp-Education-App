using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Notifications;

public sealed class Notification : AuditableEntity
{
    private Notification()
    {
        Title = string.Empty;
        Body = string.Empty;
    }

    public Notification(long userId, string title, string body)
    {
        UserId = userId;
        Title = title.Trim();
        Body = body.Trim();
    }

    public long UserId { get; private set; }
    public string Title { get; private set; }
    public string Body { get; private set; }
    public DateTimeOffset? SentAt { get; private set; }
}
