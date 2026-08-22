[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareDefinition

# Type Alias: MiddlewareDefinition

> **MiddlewareDefinition** = `object`

Defined in: [types/server.ts:467](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L467)

Middleware definition

## Properties

### name

> **name**: `string`

Defined in: [types/server.ts:469](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L469)

Middleware name

---

### order?

> `optional` **order?**: `number`

Defined in: [types/server.ts:472](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L472)

Execution order (lower = earlier)

---

### handler

> **handler**: [`MiddlewareHandler`](MiddlewareHandler.md)

Defined in: [types/server.ts:475](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L475)

Middleware handler

---

### paths?

> `optional` **paths?**: `string`[]

Defined in: [types/server.ts:478](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L478)

Paths to apply middleware to (default: all)

---

### excludePaths?

> `optional` **excludePaths?**: `string`[]

Defined in: [types/server.ts:481](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L481)

Paths to exclude from middleware
