[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentRunLegInfo

# Type Alias: AgentRunLegInfo

> **AgentRunLegInfo** = `object`

Defined in: [types/isolatedAgent.ts:285](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L285)

Per-leg accounting for leashed runs.

## Properties

### index

> **index**: `number`

Defined in: [types/isolatedAgent.ts:287](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L287)

0-based leg index.

---

### toolCalls

> **toolCalls**: `number`

Defined in: [types/isolatedAgent.ts:289](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L289)

Tool calls made this leg.

---

### durationMs

> **durationMs**: `number`

Defined in: [types/isolatedAgent.ts:291](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L291)

Wall-clock duration of this leg (ms).
