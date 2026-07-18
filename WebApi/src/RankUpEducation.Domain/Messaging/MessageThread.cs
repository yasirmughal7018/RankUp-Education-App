using RankUpEducation.Common.Utilities;
using RankUpEducation.Domain.Common;

namespace RankUpEducation.Domain.Messaging;

public sealed class MessageThread : AuditableEntity
{
    private MessageThread()
    {
        Subject = string.Empty;
    }

    public MessageThread(long schoolId, string subject)
    {
        SchoolId = schoolId;
        Subject = subject.AsTrimmedString();
    }

    public long SchoolId { get; private set; }
    public string Subject { get; private set; }
}
