[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / McpCacheConfig

# Type Alias: McpCacheConfig

> **McpCacheConfig** = `object`

Cache configuration options

## Properties

### ttl

> **ttl**: `number`

Time-to-live in milliseconds (default: 5 minutes)

---

### maxSize

> **maxSize**: `number`

Maximum number of entries (default: 500)

---

### strategy

> **strategy**: [`CacheStrategy`](CacheStrategy.md)

Eviction strategy (default: 'lru')

---

### enableAutoCleanup?

> `optional` **enableAutoCleanup?**: `boolean`

Enable automatic cleanup of expired entries

---

### cleanupInterval?

> `optional` **cleanupInterval?**: `number`

Cleanup interval in milliseconds (default: 60 seconds)

---

### namespace?

> `optional` **namespace?**: `string`

Namespace for cache keys (optional)
