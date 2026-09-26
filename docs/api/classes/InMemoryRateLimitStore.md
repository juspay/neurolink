[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InMemoryRateLimitStore

# Class: InMemoryRateLimitStore

In-memory rate limit store

## Implements

- [`RateLimitStore`](../type-aliases/RateLimitStore.md)

## Constructors

### Constructor

> **new InMemoryRateLimitStore**(): `InMemoryRateLimitStore`

#### Returns

`InMemoryRateLimitStore`

## Methods

### get()

> **get**(`key`): `Promise`\<[`RateLimitEntry`](../type-aliases/RateLimitEntry.md) \| `undefined`\>

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

#### Returns

`void`
