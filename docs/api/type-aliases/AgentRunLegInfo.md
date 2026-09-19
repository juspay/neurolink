[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentRunLegInfo

# Type Alias: AgentRunLegInfo

> **AgentRunLegInfo** = `object`

Defined in: [types/isolatedAgent.ts:294](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L294)

Per-leg accounting for leashed runs.

## Properties

### index

> **index**: `number`

Defined in: [types/isolatedAgent.ts:296](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L296)

0-based leg index.

---

### toolCalls

> **toolCalls**: `number`

Defined in: [types/isolatedAgent.ts:298](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L298)

Tool calls made this leg.

---

### durationMs

> **durationMs**: `number`

Defined in: [types/isolatedAgent.ts:300](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L300)

Wall-clock duration of this leg (ms).
