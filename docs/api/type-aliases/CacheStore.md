[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CacheStore

# Type Alias: CacheStore

> **CacheStore** = `object`

Defined in: [types/server.ts:1320](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1320)

## Methods

### get()

> **get**(`key`): `Promise`\<[`CacheEntry`](CacheEntry.md) \| `undefined`\>

Defined in: [types/server.ts:1321](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1321)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<[`CacheEntry`](CacheEntry.md) \| `undefined`\>

---

### set()

> **set**(`key`, `entry`): `Promise`\<`void`\>

Defined in: [types/server.ts:1322](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1322)

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

Defined in: [types/server.ts:1323](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1323)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

---

### clear()

> **clear**(): `Promise`\<`void`\>

Defined in: [types/server.ts:1324](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1324)

#### Returns

`Promise`\<`void`\>
