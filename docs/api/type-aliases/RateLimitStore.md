[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimitStore

# Type Alias: RateLimitStore

> **RateLimitStore** = `object`

Rate-limit store contract (memory or Redis).

## Methods

### get()

> **get**(`key`): `Promise`\<[`RateLimitEntry`](RateLimitEntry.md) \| `undefined`\>

#### Parameters

##### key

`string`

#### Returns

`Promise`\<[`RateLimitEntry`](RateLimitEntry.md) \| `undefined`\>

---

### set()

> **set**(`key`, `entry`): `Promise`\<`void`\>

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

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>
