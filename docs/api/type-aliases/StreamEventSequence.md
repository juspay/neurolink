[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamEventSequence

# Type Alias: StreamEventSequence

> **StreamEventSequence** = `object`

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

Event type (text-chunk, ui-component, tool:start, tool:end, hitl:confirmation-request, etc.)

---

### seq

> **seq**: `number`

Sequence number for ordering events

---

### timestamp

> **timestamp**: `number`

Timestamp when event occurred
