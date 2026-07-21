namespace RankUpEducation.Domain.Common;

/// <summary>Thrown when domain invariants or business rules are violated.</summary>
public sealed class BusinessRuleException : Exception
{
    public BusinessRuleException(string message)
        : base(message)
    {
    }
}
