[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareExecutionResult

# Type Alias: MiddlewareExecutionResult

> **MiddlewareExecutionResult** = `object`

Middleware execution result

## Properties

### applied

> **applied**: `boolean`

Whether the middleware was applied

---

### executionTime

> **executionTime**: `number`

Execution time in milliseconds

---

### error?

> `optional` **error?**: `Error`

Any errors that occurred

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Additional metadata from the middleware
