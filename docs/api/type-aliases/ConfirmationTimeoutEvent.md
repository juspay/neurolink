[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConfirmationTimeoutEvent

# Type Alias: ConfirmationTimeoutEvent

> **ConfirmationTimeoutEvent** = `object`

Defined in: [types/hitl.ts:184](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/hitl.ts#L184)

Event payload for confirmation timeouts
Emitted when user doesn't respond within timeout period

## Properties

### type

> **type**: `"hitl:timeout"`

Defined in: [types/hitl.ts:185](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/hitl.ts#L185)

---

### payload

> **payload**: `object`

Defined in: [types/hitl.ts:186](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/hitl.ts#L186)

#### confirmationId

> **confirmationId**: `string`

Confirmation ID that timed out

#### toolName

> **toolName**: `string`

Tool name that timed out

#### timeout

> **timeout**: `number`

Timeout duration in milliseconds
