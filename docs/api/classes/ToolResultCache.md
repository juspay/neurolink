[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolResultCache

# Class: ToolResultCache

Defined in: [mcp/caching/toolCache.ts:465](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L465)

Tool-specific cache wrapper with automatic key generation

## Constructors

### Constructor

> **new ToolResultCache**(`config?`): `ToolResultCache`

Defined in: [mcp/caching/toolCache.ts:468](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L468)

#### Parameters

##### config?

`Partial`\<[`McpCacheConfig`](../type-aliases/McpCacheConfig.md)\>

#### Returns

`ToolResultCache`

## Methods

### cacheResult()

> **cacheResult**(`toolName`, `args`, `result`, `ttl?`): `void`

Defined in: [mcp/caching/toolCache.ts:479](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L479)

Cache a tool result

#### Parameters

##### toolName

`string`

##### args

`unknown`

##### result

`unknown`

##### ttl?

`number`

#### Returns

`void`

---

### getCachedResult()

> **getCachedResult**(`toolName`, `args`): `unknown`

Defined in: [mcp/caching/toolCache.ts:492](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L492)

Get a cached tool result

#### Parameters

##### toolName

`string`

##### args

`unknown`

#### Returns

`unknown`

---

### hasCachedResult()

> **hasCachedResult**(`toolName`, `args`): `boolean`

Defined in: [mcp/caching/toolCache.ts:500](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L500)

Check if a result is cached

#### Parameters

##### toolName

`string`

##### args

`unknown`

#### Returns

`boolean`

---

### invalidateTool()

> **invalidateTool**(`toolName`): `number`

Defined in: [mcp/caching/toolCache.ts:508](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L508)

Invalidate all cached results for a tool

#### Parameters

##### toolName

`string`

#### Returns

`number`

---

### getStats()

> **getStats**(): [`CacheStats`](../type-aliases/CacheStats.md)

Defined in: [mcp/caching/toolCache.ts:515](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L515)

Get cache statistics

#### Returns

[`CacheStats`](../type-aliases/CacheStats.md)

---

### clear()

> **clear**(): `void`

Defined in: [mcp/caching/toolCache.ts:522](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L522)

Clear all cached results

#### Returns

`void`

---

### destroy()

> **destroy**(): `void`

Defined in: [mcp/caching/toolCache.ts:529](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L529)

Destroy the cache

#### Returns

`void`
