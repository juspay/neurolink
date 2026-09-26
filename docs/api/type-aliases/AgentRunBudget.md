[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentRunBudget

# Type Alias: AgentRunBudget

> **AgentRunBudget** = `object`

Cumulative budget accounting for leashed runs.

## Properties

### spentMs

> **spentMs**: `number`

Total wall-clock spent across legs (ms).

---

### remainingMs

> **remainingMs**: `number`

Remaining wall-clock vs the leg budget (ms; 0 when exhausted).

---

### spentToolCalls

> **spentToolCalls**: `number`

Total tool calls across legs.
