[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamEventSequence

# Type Alias: StreamEventSequence

> **StreamEventSequence** = `object`

Defined in: [types/conversation.ts:230](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L230)

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

Defined in: [types/conversation.ts:232](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L232)

Event type (text-chunk, ui-component, tool:start, tool:end, hitl:confirmation-request, etc.)

---

### seq

> **seq**: `number`

Defined in: [types/conversation.ts:234](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L234)

Sequence number for ordering events

---

### timestamp

> **timestamp**: `number`

Defined in: [types/conversation.ts:236](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L236)

Timestamp when event occurred
