[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkMiddlewareMetadata

# Type Alias: NeuroLinkMiddlewareMetadata

> **NeuroLinkMiddlewareMetadata** = `object`

Defined in: [types/middleware.ts:43](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L43)

Metadata type for NeuroLink middleware
Provides additional information about middleware without affecting execution

## Properties

### id

> **id**: `string`

Defined in: [types/middleware.ts:45](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L45)

Unique identifier for the middleware

---

### name

> **name**: `string`

Defined in: [types/middleware.ts:47](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L47)

Human-readable name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/middleware.ts:49](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L49)

Description of what the middleware does

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/middleware.ts:51](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L51)

Priority for ordering (higher = earlier in chain)

---

### defaultEnabled?

> `optional` **defaultEnabled?**: `boolean`

Defined in: [types/middleware.ts:53](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L53)

Whether this middleware is enabled by default

---

### configSchema?

> `optional` **configSchema?**: `Record`\<`string`, `unknown`\>

Defined in: [types/middleware.ts:55](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L55)

Configuration schema for the middleware
