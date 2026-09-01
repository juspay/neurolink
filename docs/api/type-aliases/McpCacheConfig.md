[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / McpCacheConfig

# Type Alias: McpCacheConfig

> **McpCacheConfig** = `object`

Defined in: [types/mcp.ts:2367](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2367)

Cache configuration options

## Properties

### ttl

> **ttl**: `number`

Defined in: [types/mcp.ts:2371](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2371)

Time-to-live in milliseconds (default: 5 minutes)

---

### maxSize

> **maxSize**: `number`

Defined in: [types/mcp.ts:2376](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2376)

Maximum number of entries (default: 500)

---

### strategy

> **strategy**: [`CacheStrategy`](CacheStrategy.md)

Defined in: [types/mcp.ts:2381](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2381)

Eviction strategy (default: 'lru')

---

### enableAutoCleanup?

> `optional` **enableAutoCleanup?**: `boolean`

Defined in: [types/mcp.ts:2386](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2386)

Enable automatic cleanup of expired entries

---

### cleanupInterval?

> `optional` **cleanupInterval?**: `number`

Defined in: [types/mcp.ts:2391](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2391)

Cleanup interval in milliseconds (default: 60 seconds)

---

### namespace?

> `optional` **namespace?**: `string`

Defined in: [types/mcp.ts:2396](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2396)

Namespace for cache keys (optional)
