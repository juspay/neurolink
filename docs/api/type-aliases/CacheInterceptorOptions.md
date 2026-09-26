[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CacheInterceptorOptions

# Type Alias: CacheInterceptorOptions

> **CacheInterceptorOptions** = `object`

Cache options

## Properties

### ttl

> **ttl**: `number`

Cache TTL in milliseconds

---

### maxSize?

> `optional` **maxSize?**: `number`

Maximum cache size

---

### keyGenerator?

> `optional` **keyGenerator?**: (`request`) => `string`

Cache key generator

#### Parameters

##### request

[`ClientMiddlewareRequest`](ClientMiddlewareRequest.md)

#### Returns

`string`

---

### methods?

> `optional` **methods?**: `string`[]

Methods to cache (default: ['GET'])

---

### includePaths?

> `optional` **includePaths?**: `RegExp`[]

Paths to cache (regex patterns)

---

### excludePaths?

> `optional` **excludePaths?**: `RegExp`[]

Paths to exclude from cache
