[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createCacheInvalidator

# Function: createCacheInvalidator()

> **createCacheInvalidator**(`store`): `object`

Defined in: [server/middleware/cache.ts:204](https://github.com/juspay/neurolink/blob/release/src/lib/server/middleware/cache.ts#L204)

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
