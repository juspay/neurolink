[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SupervisedResult

# Type Alias: SupervisedResult

> **SupervisedResult** = [`AgentResult`](AgentResult.md) & `object`

Defined in: [types/agentNetwork.ts:1017](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1017)

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
