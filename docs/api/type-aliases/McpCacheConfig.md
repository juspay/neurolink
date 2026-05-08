[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / McpCacheConfig

# Type Alias: McpCacheConfig

> **McpCacheConfig** = `object`

Defined in: [types/mcp.ts:2348](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2348)

Cache configuration options

## Properties

### ttl

> **ttl**: `number`

Defined in: [types/mcp.ts:2352](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2352)

Time-to-live in milliseconds (default: 5 minutes)

---

### maxSize

> **maxSize**: `number`

Defined in: [types/mcp.ts:2357](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2357)

Maximum number of entries (default: 500)

---

### strategy

> **strategy**: [`CacheStrategy`](CacheStrategy.md)

Defined in: [types/mcp.ts:2362](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2362)

Eviction strategy (default: 'lru')

---

### enableAutoCleanup?

> `optional` **enableAutoCleanup?**: `boolean`

Defined in: [types/mcp.ts:2367](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2367)

Enable automatic cleanup of expired entries

---

### cleanupInterval?

> `optional` **cleanupInterval?**: `number`

Defined in: [types/mcp.ts:2372](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2372)

Cleanup interval in milliseconds (default: 60 seconds)

---

### namespace?

> `optional` **namespace?**: `string`

Defined in: [types/mcp.ts:2377](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2377)

Namespace for cache keys (optional)
