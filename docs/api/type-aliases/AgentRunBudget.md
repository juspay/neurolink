[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentRunBudget

# Type Alias: AgentRunBudget

> **AgentRunBudget** = `object`

Defined in: [types/isolatedAgent.ts:304](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L304)

Cumulative budget accounting for leashed runs.

## Properties

### spentMs

> **spentMs**: `number`

Defined in: [types/isolatedAgent.ts:306](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L306)

Total wall-clock spent across legs (ms).

---

### remainingMs

> **remainingMs**: `number`

Defined in: [types/isolatedAgent.ts:308](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L308)

Remaining wall-clock vs the leg budget (ms; 0 when exhausted).

---

### spentToolCalls

> **spentToolCalls**: `number`

Defined in: [types/isolatedAgent.ts:310](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L310)

Total tool calls across legs.
