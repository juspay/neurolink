[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkMiddlewareMetadata

# Type Alias: NeuroLinkMiddlewareMetadata

> **NeuroLinkMiddlewareMetadata** = `object`

Defined in: [types/middleware.ts:13](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L13)

Metadata type for NeuroLink middleware
Provides additional information about middleware without affecting execution

## Properties

### id

> **id**: `string`

Defined in: [types/middleware.ts:15](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L15)

Unique identifier for the middleware

---

### name

> **name**: `string`

Defined in: [types/middleware.ts:17](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L17)

Human-readable name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/middleware.ts:19](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L19)

Description of what the middleware does

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/middleware.ts:21](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L21)

Priority for ordering (higher = earlier in chain)

---

### defaultEnabled?

> `optional` **defaultEnabled?**: `boolean`

Defined in: [types/middleware.ts:23](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L23)

Whether this middleware is enabled by default

---

### configSchema?

> `optional` **configSchema?**: `Record`\<`string`, `unknown`\>

Defined in: [types/middleware.ts:25](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L25)

Configuration schema for the middleware
