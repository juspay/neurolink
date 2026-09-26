[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkMiddlewareMetadata

# Type Alias: NeuroLinkMiddlewareMetadata

> **NeuroLinkMiddlewareMetadata** = `object`

Metadata type for NeuroLink middleware
Provides additional information about middleware without affecting execution

## Properties

### id

> **id**: `string`

Unique identifier for the middleware

---

### name

> **name**: `string`

Human-readable name

---

### description?

> `optional` **description?**: `string`

Description of what the middleware does

---

### priority?

> `optional` **priority?**: `number`

Priority for ordering (higher = earlier in chain)

---

### defaultEnabled?

> `optional` **defaultEnabled?**: `boolean`

Whether this middleware is enabled by default

---

### configSchema?

> `optional` **configSchema?**: `Record`\<`string`, `unknown`\>

Configuration schema for the middleware
