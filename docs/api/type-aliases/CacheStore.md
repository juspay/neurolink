[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CacheStore

# Type Alias: CacheStore

> **CacheStore** = `object`

## Methods

### get()

> **get**(`key`): `Promise`\<[`CacheEntry`](CacheEntry.md) \| `undefined`\>

#### Parameters

##### key

`string`

#### Returns

`Promise`\<[`CacheEntry`](CacheEntry.md) \| `undefined`\>

---

### set()

> **set**(`key`, `entry`): `Promise`\<`void`\>

#### Parameters

##### key

`string`

##### entry

[`CacheEntry`](CacheEntry.md)

#### Returns

`Promise`\<`void`\>

---

### delete()

> **delete**(`key`): `Promise`\<`void`\>

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

---

### clear()

> **clear**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>
