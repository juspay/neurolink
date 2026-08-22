[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CacheStore

# Type Alias: CacheStore

> **CacheStore** = `object`

Defined in: [types/server.ts:1320](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1320)

## Methods

### get()

> **get**(`key`): `Promise`\<[`CacheEntry`](CacheEntry.md) \| `undefined`\>

Defined in: [types/server.ts:1321](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1321)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<[`CacheEntry`](CacheEntry.md) \| `undefined`\>

---

### set()

> **set**(`key`, `entry`): `Promise`\<`void`\>

Defined in: [types/server.ts:1322](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1322)

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

Defined in: [types/server.ts:1323](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1323)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

---

### clear()

> **clear**(): `Promise`\<`void`\>

Defined in: [types/server.ts:1324](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1324)

#### Returns

`Promise`\<`void`\>
