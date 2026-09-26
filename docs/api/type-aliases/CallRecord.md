[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CallRecord

# Type Alias: CallRecord

> **CallRecord** = `object`

Call record for circuit breaker statistics tracking.
Superset shape: MCP breaker uses {timestamp, success, duration};
RAG breaker also tracks `operationType` (optional, for routing and
metrics). Both import from here.

## Properties

### timestamp

> **timestamp**: `number`

---

### success

> **success**: `boolean`

---

### duration

> **duration**: `number`

---

### operationType?

> `optional` **operationType?**: `string`
