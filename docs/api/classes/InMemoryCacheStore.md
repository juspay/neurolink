[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / InMemoryCacheStore

# Class: InMemoryCacheStore

Defined in: [server/middleware/cache.ts:25](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/server/middleware/cache.ts#L25)

In-memory LRU cache store

## Implements

- [`CacheStore`](../type-aliases/CacheStore.md)

## Constructors

### Constructor

> **new InMemoryCacheStore**(`maxSize?`): `InMemoryCacheStore`

Defined in: [server/middleware/cache.ts:30](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/server/middleware/cache.ts#L30)

#### Parameters

##### maxSize?

`number` = `1000`

#### Returns

`InMemoryCacheStore`

## Methods

### get()

> **get**(`key`): `Promise`\<[`CacheEntry`](../type-aliases/CacheEntry.md) \| `undefined`\>

Defined in: [server/middleware/cache.ts:34](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/server/middleware/cache.ts#L34)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<[`CacheEntry`](../type-aliases/CacheEntry.md) \| `undefined`\>

#### Implementation of

`CacheStore.get`

---

### set()

> **set**(`key`, `entry`): `Promise`\<`void`\>

Defined in: [server/middleware/cache.ts:52](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/server/middleware/cache.ts#L52)

#### Parameters

##### key

`string`

##### entry

[`CacheEntry`](../type-aliases/CacheEntry.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`CacheStore.set`

---

### delete()

> **delete**(`key`): `Promise`\<`void`\>

Defined in: [server/middleware/cache.ts:66](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/server/middleware/cache.ts#L66)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`CacheStore.delete`

---

### clear()

> **clear**(): `Promise`\<`void`\>

Defined in: [server/middleware/cache.ts:74](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/server/middleware/cache.ts#L74)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`CacheStore.clear`
