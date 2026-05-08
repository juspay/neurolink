[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolCache

# Class: ToolCache\<T\>

Defined in: [mcp/caching/toolCache.ts:41](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L41)

Tool Cache - High-performance caching for MCP tool results

## Example

```typescript
const cache = new ToolCache({
  ttl: 60000, // 1 minute
  maxSize: 500,
  strategy: "lru",
});

// Cache a tool result
cache.set("getUserById:123", { id: 123, name: "John" });

// Retrieve from cache
const user = cache.get("getUserById:123");

// Invalidate by pattern
cache.invalidate("getUserById:*");
```

## Extends

- `EventEmitter`

## Type Parameters

### T

`T` = `unknown`

## Constructors

### Constructor

> **new ToolCache**\<`T`\>(`config`): `ToolCache`\<`T`\>

Defined in: [mcp/caching/toolCache.ts:47](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L47)

#### Parameters

##### config

[`McpCacheConfig`](../type-aliases/McpCacheConfig.md)

#### Returns

`ToolCache`\<`T`\>

#### Overrides

`EventEmitter.constructor`

## Accessors

### size

#### Get Signature

> **get** **size**(): `number`

Defined in: [mcp/caching/toolCache.ts:252](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L252)

Get the number of entries in the cache

##### Returns

`number`

## Methods

### get()

> **get**(`key`): `T` \| `undefined`

Defined in: [mcp/caching/toolCache.ts:76](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L76)

Get a value from the cache

#### Parameters

##### key

`string`

#### Returns

`T` \| `undefined`

---

### set()

> **set**(`key`, `value`, `ttl?`): `void`

Defined in: [mcp/caching/toolCache.ts:110](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L110)

Set a value in the cache

#### Parameters

##### key

`string`

##### value

`T`

##### ttl?

`number`

#### Returns

`void`

---

### has()

> **has**(`key`): `boolean`

Defined in: [mcp/caching/toolCache.ts:138](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L138)

Check if a key exists and is not expired

#### Parameters

##### key

`string`

#### Returns

`boolean`

---

### delete()

> **delete**(`key`): `boolean`

Defined in: [mcp/caching/toolCache.ts:156](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L156)

Delete a specific key from the cache

#### Parameters

##### key

`string`

#### Returns

`boolean`

---

### invalidate()

> **invalidate**(`pattern`): `number`

Defined in: [mcp/caching/toolCache.ts:172](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L172)

Invalidate entries matching a pattern
Supports glob-style patterns with \* wildcard

#### Parameters

##### pattern

`string`

#### Returns

`number`

---

### clear()

> **clear**(): `void`

Defined in: [mcp/caching/toolCache.ts:192](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L192)

Clear all entries from the cache

#### Returns

`void`

---

### getOrSet()

> **getOrSet**(`key`, `factory`, `ttl?`): `Promise`\<`T`\>

Defined in: [mcp/caching/toolCache.ts:202](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L202)

Get or set a value (cache-aside pattern)

#### Parameters

##### key

`string`

##### factory

() => `T` \| `Promise`\<`T`\>

##### ttl?

`number`

#### Returns

`Promise`\<`T`\>

---

### getStats()

> **getStats**(): [`CacheStats`](../type-aliases/CacheStats.md)

Defined in: [mcp/caching/toolCache.ts:228](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L228)

Get cache statistics

#### Returns

[`CacheStats`](../type-aliases/CacheStats.md)

---

### resetStats()

> **resetStats**(): `void`

Defined in: [mcp/caching/toolCache.ts:235](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L235)

Reset statistics

#### Returns

`void`

---

### keys()

> **keys**(): `string`[]

Defined in: [mcp/caching/toolCache.ts:245](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L245)

Get all keys in the cache

#### Returns

`string`[]

---

### generateKey()

> `static` **generateKey**(`toolName`, `args`): `string`

Defined in: [mcp/caching/toolCache.ts:259](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L259)

Generate a cache key from tool name and arguments

#### Parameters

##### toolName

`string`

##### args

`unknown`

#### Returns

`string`

---

### destroy()

> **destroy**(): `void`

Defined in: [mcp/caching/toolCache.ts:303](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/caching/toolCache.ts#L303)

Stop the auto-cleanup timer

#### Returns

`void`
