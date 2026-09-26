[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConfirmationTimeoutEvent

# Type Alias: ConfirmationTimeoutEvent

> **ConfirmationTimeoutEvent** = `object`

Event payload for confirmation timeouts
Emitted when user doesn't respond within timeout period

## Properties

### type

> **type**: `"hitl:timeout"`

---

### payload

> **payload**: `object`

#### confirmationId

> **confirmationId**: `string`

Confirmation ID that timed out

#### toolName

> **toolName**: `string`

Tool name that timed out

#### timeout

> **timeout**: `number`

Timeout duration in milliseconds
