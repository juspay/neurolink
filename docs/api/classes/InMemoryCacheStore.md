[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InMemoryCacheStore

# Class: InMemoryCacheStore

In-memory LRU cache store

## Implements

- [`CacheStore`](../type-aliases/CacheStore.md)

## Constructors

### Constructor

> **new InMemoryCacheStore**(`maxSize?`): `InMemoryCacheStore`

#### Parameters

##### maxSize?

`number` = `1000`

#### Returns

`InMemoryCacheStore`

## Methods

### get()

> **get**(`key`): `Promise`\<[`CacheEntry`](../type-aliases/CacheEntry.md) \| `undefined`\>

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

#### Returns

`Promise`\<`void`\>

#### Implementation of

`CacheStore.clear`
