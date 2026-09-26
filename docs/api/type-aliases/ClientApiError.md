[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientApiError

# Type Alias: ClientApiError

> **ClientApiError** = `object`

Error response from API

## Properties

### code

> **code**: `string`

Error code (e.g., "RATE_LIMIT_EXCEEDED", "INVALID_REQUEST")

---

### message

> **message**: `string`

Human-readable error message

---

### status

> **status**: `number`

HTTP status code

---

### details?

> `optional` **details?**: [`JsonObject`](JsonObject.md)

Additional error details

---

### retryable?

> `optional` **retryable?**: `boolean`

Whether the error is retryable

---

### requestId?

> `optional` **requestId?**: `string`

Request ID for tracing
