[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerCacheConfig

# Type Alias: ServerCacheConfig

> **ServerCacheConfig** = `object`

Cache configuration

## Properties

### ttlMs

> **ttlMs**: `number`

Default TTL in milliseconds

---

### maxSize?

> `optional` **maxSize?**: `number`

Maximum cache size (number of entries)

---

### keyGenerator?

> `optional` **keyGenerator?**: (`ctx`) => `string`

Custom key generator
Default: method + path + sorted query params

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

#### Returns

`string`

---

### methods?

> `optional` **methods?**: `string`[]

Methods to cache (default: GET only)

---

### paths?

> `optional` **paths?**: `string`[]

Paths to cache (default: all paths)

---

### excludePaths?

> `optional` **excludePaths?**: `string`[]

Paths to exclude from caching

---

### store?

> `optional` **store?**: [`CacheStore`](CacheStore.md)

Custom cache store
Default: in-memory store

---

### includeQuery?

> `optional` **includeQuery?**: `boolean`

Whether to include query params in cache key
Default: true

---

### ttlByPath?

> `optional` **ttlByPath?**: `Record`\<`string`, `number`\>

Custom TTL per path pattern
