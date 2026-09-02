[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolResultCache

# Class: ToolResultCache

Defined in: [mcp/caching/toolCache.ts:514](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L514)

Tool-specific cache wrapper with automatic key generation

## Constructors

### Constructor

> **new ToolResultCache**(`config?`): `ToolResultCache`

Defined in: [mcp/caching/toolCache.ts:517](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L517)

#### Parameters

##### config?

`Partial`\<[`McpCacheConfig`](../type-aliases/McpCacheConfig.md)\>

#### Returns

`ToolResultCache`

## Methods

### cacheResult()

> **cacheResult**(`toolName`, `args`, `result`, `ttl?`): `void`

Defined in: [mcp/caching/toolCache.ts:528](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L528)

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

Defined in: [mcp/caching/toolCache.ts:541](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L541)

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

Defined in: [mcp/caching/toolCache.ts:549](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L549)

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

Defined in: [mcp/caching/toolCache.ts:557](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L557)

Invalidate all cached results for a tool

#### Parameters

##### toolName

`string`

#### Returns

`number`

---

### getStats()

> **getStats**(): [`CacheStats`](../type-aliases/CacheStats.md)

Defined in: [mcp/caching/toolCache.ts:564](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L564)

Get cache statistics

#### Returns

[`CacheStats`](../type-aliases/CacheStats.md)

---

### clear()

> **clear**(): `void`

Defined in: [mcp/caching/toolCache.ts:571](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L571)

Clear all cached results

#### Returns

`void`

---

### destroy()

> **destroy**(): `void`

Defined in: [mcp/caching/toolCache.ts:578](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L578)

Destroy the cache

#### Returns

`void`
