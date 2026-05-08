[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CacheInterceptorOptions

# Type Alias: CacheInterceptorOptions

> **CacheInterceptorOptions** = `object`

Defined in: [types/client.ts:1345](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1345)

Cache options

## Properties

### ttl

> **ttl**: `number`

Defined in: [types/client.ts:1347](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1347)

Cache TTL in milliseconds

---

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/client.ts:1349](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1349)

Maximum cache size

---

### keyGenerator?

> `optional` **keyGenerator?**: (`request`) => `string`

Defined in: [types/client.ts:1351](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1351)

Cache key generator

#### Parameters

##### request

[`ClientMiddlewareRequest`](ClientMiddlewareRequest.md)

#### Returns

`string`

---

### methods?

> `optional` **methods?**: `string`[]

Defined in: [types/client.ts:1353](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1353)

Methods to cache (default: ['GET'])

---

### includePaths?

> `optional` **includePaths?**: `RegExp`[]

Defined in: [types/client.ts:1355](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1355)

Paths to cache (regex patterns)

---

### excludePaths?

> `optional` **excludePaths?**: `RegExp`[]

Defined in: [types/client.ts:1357](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1357)

Paths to exclude from cache
