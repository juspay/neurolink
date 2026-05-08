[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareExecutionResult

# Type Alias: MiddlewareExecutionResult

> **MiddlewareExecutionResult** = `object`

Defined in: [types/middleware.ts:97](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L97)

Middleware execution result

## Properties

### applied

> **applied**: `boolean`

Defined in: [types/middleware.ts:99](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L99)

Whether the middleware was applied

---

### executionTime

> **executionTime**: `number`

Defined in: [types/middleware.ts:101](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L101)

Execution time in milliseconds

---

### error?

> `optional` **error?**: `Error`

Defined in: [types/middleware.ts:103](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L103)

Any errors that occurred

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/middleware.ts:105](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L105)

Additional metadata from the middleware
