[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConfirmationTimeoutEvent

# Type Alias: ConfirmationTimeoutEvent

> **ConfirmationTimeoutEvent** = `object`

Defined in: [types/hitl.ts:184](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L184)

Event payload for confirmation timeouts
Emitted when user doesn't respond within timeout period

## Properties

### type

> **type**: `"hitl:timeout"`

Defined in: [types/hitl.ts:185](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L185)

---

### payload

> **payload**: `object`

Defined in: [types/hitl.ts:186](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L186)

#### confirmationId

> **confirmationId**: `string`

Confirmation ID that timed out

#### toolName

> **toolName**: `string`

Tool name that timed out

#### timeout

> **timeout**: `number`

Timeout duration in milliseconds
