[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolCall

# Type Alias: SageMakerStreamingToolCall

> **SageMakerStreamingToolCall** = `object`

Streaming tool call information (Phase 2.3)

## Properties

### id

> **id**: `string`

Tool call identifier

---

### name?

> `optional` **name?**: `string`

Tool/function name

---

### arguments?

> `optional` **arguments?**: `string`

Partial or complete arguments as JSON string

---

### type

> **type**: `"function"`

Tool call type

---

### complete?

> `optional` **complete?**: `boolean`

Indicates if this tool call is complete

---

### argumentsDelta?

> `optional` **argumentsDelta?**: `string`

Delta text for incremental argument building
