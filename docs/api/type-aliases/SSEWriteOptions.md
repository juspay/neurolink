[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEWriteOptions

# Type Alias: SSEWriteOptions

> **SSEWriteOptions** = `object`

SSE write options

## Properties

### event?

> `optional` **event?**: `string`

Event name

---

### data

> **data**: `string` \| `object`

Event data (will be JSON stringified if object)

---

### id?

> `optional` **id?**: `string`

Event ID

---

### retry?

> `optional` **retry?**: `number`

Retry interval in milliseconds
