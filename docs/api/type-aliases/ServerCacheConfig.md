[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerCacheConfig

# Type Alias: ServerCacheConfig

> **ServerCacheConfig** = `object`

Defined in: [types/server.ts:1258](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1258)

Cache configuration

## Properties

### ttlMs

> **ttlMs**: `number`

Defined in: [types/server.ts:1260](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1260)

Default TTL in milliseconds

---

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/server.ts:1263](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1263)

Maximum cache size (number of entries)

---

### keyGenerator?

> `optional` **keyGenerator?**: (`ctx`) => `string`

Defined in: [types/server.ts:1269](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1269)

Custom key generator
Default: method + path + sorted query params

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

#### Returns

`string`

---

### methods?

> `optional` **methods?**: `string`[]

Defined in: [types/server.ts:1274](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1274)

Methods to cache (default: GET only)

---

### paths?

> `optional` **paths?**: `string`[]

Defined in: [types/server.ts:1279](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1279)

Paths to cache (default: all paths)

---

### excludePaths?

> `optional` **excludePaths?**: `string`[]

Defined in: [types/server.ts:1284](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1284)

Paths to exclude from caching

---

### store?

> `optional` **store?**: [`CacheStore`](CacheStore.md)

Defined in: [types/server.ts:1290](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1290)

Custom cache store
Default: in-memory store

---

### includeQuery?

> `optional` **includeQuery?**: `boolean`

Defined in: [types/server.ts:1296](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1296)

Whether to include query params in cache key
Default: true

---

### ttlByPath?

> `optional` **ttlByPath?**: `Record`\<`string`, `number`\>

Defined in: [types/server.ts:1301](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1301)

Custom TTL per path pattern
