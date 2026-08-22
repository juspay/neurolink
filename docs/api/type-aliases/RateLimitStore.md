[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimitStore

# Type Alias: RateLimitStore

> **RateLimitStore** = `object`

Defined in: [types/middleware.ts:450](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L450)

Rate-limit store contract (memory or Redis).

## Methods

### get()

> **get**(`key`): `Promise`\<[`RateLimitEntry`](RateLimitEntry.md) \| `undefined`\>

Defined in: [types/middleware.ts:451](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L451)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<[`RateLimitEntry`](RateLimitEntry.md) \| `undefined`\>

---

### set()

> **set**(`key`, `entry`): `Promise`\<`void`\>

Defined in: [types/middleware.ts:452](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L452)

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

Defined in: [types/middleware.ts:453](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L453)

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

Defined in: [types/middleware.ts:454](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L454)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>
