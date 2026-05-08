[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createCacheInvalidator

# Function: createCacheInvalidator()

> **createCacheInvalidator**(`store`): `object`

Defined in: [server/middleware/cache.ts:204](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/middleware/cache.ts#L204)

Create a cache invalidation helper

## Parameters

### store

[`CacheStore`](../type-aliases/CacheStore.md)

## Returns

`object`

### invalidate

> **invalidate**: (`pattern`) => `Promise`\<`void`\>

#### Parameters

##### pattern

`string`

#### Returns

`Promise`\<`void`\>

### clear

> **clear**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>
