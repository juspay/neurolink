[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimitStore

# Type Alias: RateLimitStore

> **RateLimitStore** = `object`

Defined in: [types/middleware.ts:392](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L392)

Rate-limit store contract (memory or Redis).

## Methods

### get()

> **get**(`key`): `Promise`\<[`RateLimitEntry`](RateLimitEntry.md) \| `undefined`\>

Defined in: [types/middleware.ts:393](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L393)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<[`RateLimitEntry`](RateLimitEntry.md) \| `undefined`\>

---

### set()

> **set**(`key`, `entry`): `Promise`\<`void`\>

Defined in: [types/middleware.ts:394](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L394)

#### Parameters

##### key

`string`

##### entry

[`RateLimitEntry`](RateLimitEntry.md)

#### Returns

`Promise`\<`void`\>

---

### increment()

> **increment**(`key`, `windowMs`): `Promise`\<[`RateLimitEntry`](RateLimitEntry.md)\>

Defined in: [types/middleware.ts:395](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L395)

#### Parameters

##### key

`string`

##### windowMs

`number`

#### Returns

`Promise`\<[`RateLimitEntry`](RateLimitEntry.md)\>

---

### reset()

> **reset**(`key`): `Promise`\<`void`\>

Defined in: [types/middleware.ts:396](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L396)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>
