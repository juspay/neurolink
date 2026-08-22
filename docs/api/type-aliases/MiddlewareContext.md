[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareContext

# Type Alias: MiddlewareContext

> **MiddlewareContext** = `object`

Defined in: [types/middleware.ts:96](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L96)

Context passed to middleware for decision making

## Properties

### provider

> **provider**: `string`

Defined in: [types/middleware.ts:98](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L98)

Provider name

---

### model

> **model**: `string`

Defined in: [types/middleware.ts:100](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L100)

Model name

---

### options

> **options**: `Record`\<`string`, `unknown`\>

Defined in: [types/middleware.ts:102](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L102)

Request options

---

### session?

> `optional` **session?**: `object`

Defined in: [types/middleware.ts:104](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L104)

Session information

#### sessionId?

> `optional` **sessionId?**: `string`

#### userId?

> `optional` **userId?**: `string`

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/middleware.ts:109](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L109)

Additional metadata
