[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SupervisedResult

# Type Alias: SupervisedResult

> **SupervisedResult** = [`AgentResult`](AgentResult.md) & `object`

Defined in: [types/agentNetwork.ts:1017](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1017)

Result of supervised execution

## Type Declaration

### requiredApproval

> **requiredApproval**: `boolean`

Whether approval was required

### approvalDecision?

> `optional` **approvalDecision?**: [`ReviewDecision`](ReviewDecision.md)

Approval decision

### escalation?

> `optional` **escalation?**: [`EscalationResult`](EscalationResult.md)

Escalation info if escalated
