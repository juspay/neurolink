[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareContext

# Type Alias: MiddlewareContext

> **MiddlewareContext** = `object`

Defined in: [types/middleware.ts:90](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L90)

Context passed to middleware for decision making

## Properties

### provider

> **provider**: `string`

Defined in: [types/middleware.ts:92](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L92)

Provider name

---

### model

> **model**: `string`

Defined in: [types/middleware.ts:94](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L94)

Model name

---

### options

> **options**: `Record`\<`string`, `unknown`\>

Defined in: [types/middleware.ts:96](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L96)

Request options

---

### session?

> `optional` **session?**: `object`

Defined in: [types/middleware.ts:98](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L98)

Session information

#### sessionId?

> `optional` **sessionId?**: `string`

#### userId?

> `optional` **userId?**: `string`

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/middleware.ts:103](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L103)

Additional metadata
