[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimitStore

# Type Alias: RateLimitStore

> **RateLimitStore** = `object`

Defined in: [types/middleware.ts:444](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L444)

Rate-limit store contract (memory or Redis).

## Methods

### get()

> **get**(`key`): `Promise`\<[`RateLimitEntry`](RateLimitEntry.md) \| `undefined`\>

Defined in: [types/middleware.ts:445](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L445)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<[`RateLimitEntry`](RateLimitEntry.md) \| `undefined`\>

---

### set()

> **set**(`key`, `entry`): `Promise`\<`void`\>

Defined in: [types/middleware.ts:446](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L446)

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

Defined in: [types/middleware.ts:447](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L447)

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

Defined in: [types/middleware.ts:448](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L448)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>
