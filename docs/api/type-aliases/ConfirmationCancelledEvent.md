[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConfirmationCancelledEvent

# Type Alias: ConfirmationCancelledEvent

> **ConfirmationCancelledEvent** = `object`

Event payload for a withdrawn confirmation
Emitted when the call that asked was aborted before anyone answered, so the
approval UI can retire the card: a later answer to it runs nothing.

## Properties

### type

> **type**: `"hitl:cancelled"`

---

### payload

> **payload**: `object`

#### confirmationId

> **confirmationId**: `string`

Confirmation ID that was withdrawn

#### toolName

> **toolName**: `string`

Tool name whose confirmation was withdrawn

#### reason

> **reason**: `string`

Why it was withdrawn: the abort reason, when the caller gave one
