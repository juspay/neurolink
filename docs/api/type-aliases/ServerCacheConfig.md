[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerCacheConfig

# Type Alias: ServerCacheConfig

> **ServerCacheConfig** = `object`

Defined in: [types/server.ts:1249](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1249)

Cache configuration

## Properties

### ttlMs

> **ttlMs**: `number`

Defined in: [types/server.ts:1251](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1251)

Default TTL in milliseconds

---

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/server.ts:1254](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1254)

Maximum cache size (number of entries)

---

### keyGenerator?

> `optional` **keyGenerator?**: (`ctx`) => `string`

Defined in: [types/server.ts:1260](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1260)

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

Defined in: [types/server.ts:1265](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1265)

Methods to cache (default: GET only)

---

### paths?

> `optional` **paths?**: `string`[]

Defined in: [types/server.ts:1270](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1270)

Paths to cache (default: all paths)

---

### excludePaths?

> `optional` **excludePaths?**: `string`[]

Defined in: [types/server.ts:1275](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1275)

Paths to exclude from caching

---

### store?

> `optional` **store?**: [`CacheStore`](CacheStore.md)

Defined in: [types/server.ts:1281](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1281)

Custom cache store
Default: in-memory store

---

### includeQuery?

> `optional` **includeQuery?**: `boolean`

Defined in: [types/server.ts:1287](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1287)

Whether to include query params in cache key
Default: true

---

### ttlByPath?

> `optional` **ttlByPath?**: `Record`\<`string`, `number`\>

Defined in: [types/server.ts:1292](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1292)

Custom TTL per path pattern
