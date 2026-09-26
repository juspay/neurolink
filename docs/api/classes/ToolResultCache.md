[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolResultCache

# Class: ToolResultCache

Tool-specific cache wrapper with automatic key generation

## Constructors

### Constructor

> **new ToolResultCache**(`config?`): `ToolResultCache`

#### Parameters

##### config?

`Partial`\<[`McpCacheConfig`](../type-aliases/McpCacheConfig.md)\>

#### Returns

`ToolResultCache`

## Methods

### cacheResult()

> **cacheResult**(`toolName`, `args`, `result`, `ttl?`): `void`

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

Invalidate all cached results for a tool

#### Parameters

##### toolName

`string`

#### Returns

`number`

---

### getStats()

> **getStats**(): [`CacheStats`](../type-aliases/CacheStats.md)

Get cache statistics

#### Returns

[`CacheStats`](../type-aliases/CacheStats.md)

---

### clear()

> **clear**(): `void`

Clear all cached results

#### Returns

`void`

---

### destroy()

> **destroy**(): `void`

Destroy the cache

#### Returns

`void`
