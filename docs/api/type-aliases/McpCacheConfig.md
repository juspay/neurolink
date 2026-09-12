[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / McpCacheConfig

# Type Alias: McpCacheConfig

> **McpCacheConfig** = `object`

Defined in: [types/mcp.ts:2386](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2386)

Cache configuration options

## Properties

### ttl

> **ttl**: `number`

Defined in: [types/mcp.ts:2390](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2390)

Time-to-live in milliseconds (default: 5 minutes)

---

### maxSize

> **maxSize**: `number`

Defined in: [types/mcp.ts:2395](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2395)

Maximum number of entries (default: 500)

---

### strategy

> **strategy**: [`CacheStrategy`](CacheStrategy.md)

Defined in: [types/mcp.ts:2400](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2400)

Eviction strategy (default: 'lru')

---

### enableAutoCleanup?

> `optional` **enableAutoCleanup?**: `boolean`

Defined in: [types/mcp.ts:2405](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2405)

Enable automatic cleanup of expired entries

---

### cleanupInterval?

> `optional` **cleanupInterval?**: `number`

Defined in: [types/mcp.ts:2410](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2410)

Cleanup interval in milliseconds (default: 60 seconds)

---

### namespace?

> `optional` **namespace?**: `string`

Defined in: [types/mcp.ts:2415](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2415)

Namespace for cache keys (optional)
