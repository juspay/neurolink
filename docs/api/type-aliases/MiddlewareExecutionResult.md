[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareExecutionResult

# Type Alias: MiddlewareExecutionResult

> **MiddlewareExecutionResult** = `object`

Defined in: [types/middleware.ts:121](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L121)

Middleware execution result

## Properties

### applied

> **applied**: `boolean`

Defined in: [types/middleware.ts:123](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L123)

Whether the middleware was applied

---

### executionTime

> **executionTime**: `number`

Defined in: [types/middleware.ts:125](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L125)

Execution time in milliseconds

---

### error?

> `optional` **error?**: `Error`

Defined in: [types/middleware.ts:127](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L127)

Any errors that occurred

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/middleware.ts:129](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L129)

Additional metadata from the middleware
