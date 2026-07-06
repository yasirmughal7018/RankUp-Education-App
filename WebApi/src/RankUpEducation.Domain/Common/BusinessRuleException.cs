namespace RankUpEducation.Domain.Common;

public sealed class BusinessRuleException : Exception
{
    public BusinessRuleException(string message)
        : base(message)
    {
    }
}
