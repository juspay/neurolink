[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MemoryRateLimitStorage

# Class: MemoryRateLimitStorage

Defined in: [auth/middleware/rateLimitByUser.ts:25](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/auth/middleware/rateLimitByUser.ts#L25)

In-memory storage for rate limiting (single instance deployments)

## Implements

- [`RateLimitStorage`](../type-aliases/RateLimitStorage.md)

## Constructors

### Constructor

> **new MemoryRateLimitStorage**(`cleanupIntervalMs?`, `expiryMs?`): `MemoryRateLimitStorage`

Defined in: [auth/middleware/rateLimitByUser.ts:30](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/auth/middleware/rateLimitByUser.ts#L30)

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

Defined in: [auth/middleware/rateLimitByUser.ts:40](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/auth/middleware/rateLimitByUser.ts#L40)

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

Defined in: [auth/middleware/rateLimitByUser.ts:44](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/auth/middleware/rateLimitByUser.ts#L44)

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

Defined in: [auth/middleware/rateLimitByUser.ts:48](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/auth/middleware/rateLimitByUser.ts#L48)

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

Defined in: [auth/middleware/rateLimitByUser.ts:52](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/auth/middleware/rateLimitByUser.ts#L52)

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

`RateLimitStorage.healthCheck`

---

### cleanup()

> **cleanup**(): `Promise`\<`void`\>

Defined in: [auth/middleware/rateLimitByUser.ts:56](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/auth/middleware/rateLimitByUser.ts#L56)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`RateLimitStorage.cleanup`
