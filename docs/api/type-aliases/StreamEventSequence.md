[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamEventSequence

# Type Alias: StreamEventSequence

> **StreamEventSequence** = `object`

Defined in: [types/conversation.ts:238](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L238)

Stream event for event sequence tracking
Used to reconstruct exact flow of streaming responses with proper ordering

## Since

8.21.0

## Indexable

> \[`key`: `string`\]: `unknown`

Event-specific data

## Properties

### type

> **type**: `string`

Defined in: [types/conversation.ts:240](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L240)

Event type (text-chunk, ui-component, tool:start, tool:end, hitl:confirmation-request, etc.)

---

### seq

> **seq**: `number`

Defined in: [types/conversation.ts:242](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L242)

Sequence number for ordering events

---

### timestamp

> **timestamp**: `number`

Defined in: [types/conversation.ts:244](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L244)

Timestamp when event occurred
