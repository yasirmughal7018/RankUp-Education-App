using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Notifications;

public sealed class Notification : AuditableEntity
{
    private Notification()
    {
        Title = string.Empty;
        Body = string.Empty;
        Category = string.Empty;
    }

    public Notification(long userId, string title, string body, string category)
    {
        UserId = userId;
        Title = title.Trim();
        Body = body.Trim();
        Category = category.Trim();
        IsRead = false;
    }

    public long UserId { get; private set; }
    public string Title { get; private set; }
    public string Body { get; private set; }
    public string Category { get; private set; }
    public bool IsRead { get; private set; }

    public void MarkRead()
    {
        IsRead = true;
    }
}
