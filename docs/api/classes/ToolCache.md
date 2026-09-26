[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolCache

# Class: ToolCache\<T\>

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

Get the number of entries in the cache

##### Returns

`number`

## Methods

### get()

> **get**(`key`): `T` \| `undefined`

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

Check if a key exists and is not expired

#### Parameters

##### key

`string`

#### Returns

`boolean`

---

### delete()

> **delete**(`key`): `boolean`

Delete a specific key from the cache

#### Parameters

##### key

`string`

#### Returns

`boolean`

---

### invalidate()

> **invalidate**(`pattern`): `number`

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

Clear all entries from the cache

#### Returns

`void`

---

### getOrSet()

> **getOrSet**(`key`, `factory`, `ttl?`): `Promise`\<`T`\>

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

Get cache statistics

#### Returns

[`CacheStats`](../type-aliases/CacheStats.md)

---

### resetStats()

> **resetStats**(): `void`

Reset statistics

#### Returns

`void`

---

### keys()

> **keys**(): `string`[]

Get all keys in the cache

#### Returns

`string`[]

---

### generateKey()

> `static` **generateKey**(`toolName`, `args`): `string`

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

Stop the auto-cleanup timer

#### Returns

`void`
