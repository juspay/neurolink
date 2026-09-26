[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerAdapterErrorContext

# Type Alias: ServerAdapterErrorContext

> **ServerAdapterErrorContext** = `object`

Error context for server adapter errors

## Properties

### category

> **category**: [`ErrorCategoryType`](ErrorCategoryType.md)

---

### severity

> **severity**: [`ErrorSeverityType`](ErrorSeverityType.md)

---

### retryable

> **retryable**: `boolean`

---

### retryAfterMs?

> `optional` **retryAfterMs?**: `number`

---

### requestId?

> `optional` **requestId?**: `string`

---

### path?

> `optional` **path?**: `string`

---

### method?

> `optional` **method?**: `string`

---

### details?

> `optional` **details?**: `Record`\<`string`, `unknown`\>

---

### cause?

> `optional` **cause?**: `Error`
