[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MemoryRateLimitStorage

# Class: MemoryRateLimitStorage

In-memory storage for rate limiting (single instance deployments)

## Implements

- [`RateLimitStorage`](../type-aliases/RateLimitStorage.md)

## Constructors

### Constructor

> **new MemoryRateLimitStorage**(`cleanupIntervalMs?`, `expiryMs?`): `MemoryRateLimitStorage`

#### Parameters

##### cleanupIntervalMs?

`number` = `60000`

##### expiryMs?

`number` = `3600000`

#### Returns

`MemoryRateLimitStorage`

## Methods

### getBucket()

> **getBucket**(`userId`): `Promise`\<[`TokenBucket`](../type-aliases/TokenBucket.md) \| `null`\>

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`TokenBucket`](../type-aliases/TokenBucket.md) \| `null`\>

#### Implementation of

`RateLimitStorage.getBucket`

---

### setBucket()

> **setBucket**(`userId`, `bucket`): `Promise`\<`void`\>

#### Parameters

##### userId

`string`

##### bucket

[`TokenBucket`](../type-aliases/TokenBucket.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`RateLimitStorage.setBucket`

---

### deleteBucket()

> **deleteBucket**(`userId`): `Promise`\<`void`\>

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`RateLimitStorage.deleteBucket`

---

### healthCheck()

> **healthCheck**(): `Promise`\<`boolean`\>

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

`RateLimitStorage.healthCheck`

---

### cleanup()

> **cleanup**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Implementation of

`RateLimitStorage.cleanup`
