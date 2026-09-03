[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkMiddlewareMetadata

# Type Alias: NeuroLinkMiddlewareMetadata

> **NeuroLinkMiddlewareMetadata** = `object`

Defined in: [types/middleware.ts:37](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L37)

Metadata type for NeuroLink middleware
Provides additional information about middleware without affecting execution

## Properties

### id

> **id**: `string`

Defined in: [types/middleware.ts:39](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L39)

Unique identifier for the middleware

---

### name

> **name**: `string`

Defined in: [types/middleware.ts:41](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L41)

Human-readable name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/middleware.ts:43](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L43)

Description of what the middleware does

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/middleware.ts:45](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L45)

Priority for ordering (higher = earlier in chain)

---

### defaultEnabled?

> `optional` **defaultEnabled?**: `boolean`

Defined in: [types/middleware.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L47)

Whether this middleware is enabled by default

---

### configSchema?

> `optional` **configSchema?**: `Record`\<`string`, `unknown`\>

Defined in: [types/middleware.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L49)

Configuration schema for the middleware
