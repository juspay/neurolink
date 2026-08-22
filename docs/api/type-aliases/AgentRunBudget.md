[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentRunBudget

# Type Alias: AgentRunBudget

> **AgentRunBudget** = `object`

Defined in: [types/isolatedAgent.ts:295](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L295)

Cumulative budget accounting for leashed runs.

## Properties

### spentMs

> **spentMs**: `number`

Defined in: [types/isolatedAgent.ts:297](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L297)

Total wall-clock spent across legs (ms).

---

### remainingMs

> **remainingMs**: `number`

Defined in: [types/isolatedAgent.ts:299](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L299)

Remaining wall-clock vs the leg budget (ms; 0 when exhausted).

---

### spentToolCalls

> **spentToolCalls**: `number`

Defined in: [types/isolatedAgent.ts:301](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L301)

Total tool calls across legs.
