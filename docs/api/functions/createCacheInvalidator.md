[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createCacheInvalidator

# Function: createCacheInvalidator()

> **createCacheInvalidator**(`store`): `object`

Defined in: [server/middleware/cache.ts:204](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/server/middleware/cache.ts#L204)

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
