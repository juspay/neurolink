[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createCacheInvalidator

# Function: createCacheInvalidator()

> **createCacheInvalidator**(`store`): `object`

Defined in: [server/middleware/cache.ts:204](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/server/middleware/cache.ts#L204)

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
