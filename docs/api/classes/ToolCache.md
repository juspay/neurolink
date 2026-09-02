[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolCache

# Class: ToolCache\<T\>

Defined in: [mcp/caching/toolCache.ts:41](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L41)

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

Defined in: [mcp/caching/toolCache.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L47)

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

Defined in: [mcp/caching/toolCache.ts:269](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L269)

Get the number of entries in the cache

##### Returns

`number`

## Methods

### get()

> **get**(`key`): `T` \| `undefined`

Defined in: [mcp/caching/toolCache.ts:80](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L80)

Get a value from the cache

Returns an isolated copy of the stored value (see `cloneCachedValue`), so
a caller mutating what it gets back cannot corrupt the entry for later
hits or for other concurrent callers of the same key.

#### Parameters

##### key

`string`

#### Returns

`T` \| `undefined`

---

### set()

> **set**(`key`, `value`, `ttl?`): `void`

Defined in: [mcp/caching/toolCache.ts:127](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L127)

Set a value in the cache

Stores an isolated copy of `value` (see `cloneCachedValue`), so mutating
the caller's original object after this call cannot reach into the
cache entry.

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

Defined in: [mcp/caching/toolCache.ts:155](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L155)

Check if a key exists and is not expired

#### Parameters

##### key

`string`

#### Returns

`boolean`

---

### delete()

> **delete**(`key`): `boolean`

Defined in: [mcp/caching/toolCache.ts:173](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L173)

Delete a specific key from the cache

#### Parameters

##### key

`string`

#### Returns

`boolean`

---

### invalidate()

> **invalidate**(`pattern`): `number`

Defined in: [mcp/caching/toolCache.ts:189](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L189)

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

Defined in: [mcp/caching/toolCache.ts:209](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L209)

Clear all entries from the cache

#### Returns

`void`

---

### getOrSet()

> **getOrSet**(`key`, `factory`, `ttl?`): `Promise`\<`T`\>

Defined in: [mcp/caching/toolCache.ts:219](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L219)

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

Defined in: [mcp/caching/toolCache.ts:245](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L245)

Get cache statistics

#### Returns

[`CacheStats`](../type-aliases/CacheStats.md)

---

### resetStats()

> **resetStats**(): `void`

Defined in: [mcp/caching/toolCache.ts:252](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L252)

Reset statistics

#### Returns

`void`

---

### keys()

> **keys**(): `string`[]

Defined in: [mcp/caching/toolCache.ts:262](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L262)

Get all keys in the cache

#### Returns

`string`[]

---

### generateKey()

> `static` **generateKey**(`toolName`, `args`): `string`

Defined in: [mcp/caching/toolCache.ts:276](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L276)

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

Defined in: [mcp/caching/toolCache.ts:320](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/caching/toolCache.ts#L320)

Stop the auto-cleanup timer

#### Returns

`void`
