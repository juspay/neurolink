[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / InMemoryRateLimitStore

# Class: InMemoryRateLimitStore

Defined in: [server/middleware/rateLimit.ts:19](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/middleware/rateLimit.ts#L19)

In-memory rate limit store

## Implements

- [`RateLimitStore`](../type-aliases/RateLimitStore.md)

## Constructors

### Constructor

> **new InMemoryRateLimitStore**(): `InMemoryRateLimitStore`

Defined in: [server/middleware/rateLimit.ts:23](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/middleware/rateLimit.ts#L23)

#### Returns

`InMemoryRateLimitStore`

## Methods

### get()

> **get**(`key`): `Promise`\<[`RateLimitEntry`](../type-aliases/RateLimitEntry.md) \| `undefined`\>

Defined in: [server/middleware/rateLimit.ts:28](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/middleware/rateLimit.ts#L28)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<[`RateLimitEntry`](../type-aliases/RateLimitEntry.md) \| `undefined`\>

#### Implementation of

`RateLimitStore.get`

---

### set()

> **set**(`key`, `entry`): `Promise`\<`void`\>

Defined in: [server/middleware/rateLimit.ts:43](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/middleware/rateLimit.ts#L43)

#### Parameters

##### key

`string`

##### entry

[`RateLimitEntry`](../type-aliases/RateLimitEntry.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`RateLimitStore.set`

---

### increment()

> **increment**(`key`, `windowMs`): `Promise`\<[`RateLimitEntry`](../type-aliases/RateLimitEntry.md)\>

Defined in: [server/middleware/rateLimit.ts:47](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/middleware/rateLimit.ts#L47)

#### Parameters

##### key

`string`

##### windowMs

`number`

#### Returns

`Promise`\<[`RateLimitEntry`](../type-aliases/RateLimitEntry.md)\>

#### Implementation of

`RateLimitStore.increment`

---

### reset()

> **reset**(`key`): `Promise`\<`void`\>

Defined in: [server/middleware/rateLimit.ts:60](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/middleware/rateLimit.ts#L60)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`RateLimitStore.reset`

---

### destroy()

> **destroy**(): `void`

Defined in: [server/middleware/rateLimit.ts:73](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/middleware/rateLimit.ts#L73)

#### Returns

`void`
