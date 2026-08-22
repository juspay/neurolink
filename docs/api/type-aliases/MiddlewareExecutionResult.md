[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareExecutionResult

# Type Alias: MiddlewareExecutionResult

> **MiddlewareExecutionResult** = `object`

Defined in: [types/middleware.ts:127](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L127)

Middleware execution result

## Properties

### applied

> **applied**: `boolean`

Defined in: [types/middleware.ts:129](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L129)

Whether the middleware was applied

---

### executionTime

> **executionTime**: `number`

Defined in: [types/middleware.ts:131](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L131)

Execution time in milliseconds

---

### error?

> `optional` **error?**: `Error`

Defined in: [types/middleware.ts:133](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L133)

Any errors that occurred

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/middleware.ts:135](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L135)

Additional metadata from the middleware
