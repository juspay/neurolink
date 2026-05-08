[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamEventSequence

# Type Alias: StreamEventSequence

> **StreamEventSequence** = `object`

Defined in: [types/conversation.ts:203](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L203)

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

Defined in: [types/conversation.ts:205](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L205)

Event type (text-chunk, ui-component, tool:start, tool:end, hitl:confirmation-request, etc.)

---

### seq

> **seq**: `number`

Defined in: [types/conversation.ts:207](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L207)

Sequence number for ordering events

---

### timestamp

> **timestamp**: `number`

Defined in: [types/conversation.ts:209](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L209)

Timestamp when event occurred
