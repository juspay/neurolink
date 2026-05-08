[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RedisRateLimitStorage

# Class: RedisRateLimitStorage

Defined in: [auth/middleware/rateLimitByUser.ts:78](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/rateLimitByUser.ts#L78)

Redis-backed storage for rate limiting (distributed deployments)

## Implements

- [`RateLimitStorage`](../type-aliases/RateLimitStorage.md)

## Constructors

### Constructor

> **new RedisRateLimitStorage**(`config`): `RedisRateLimitStorage`

Defined in: [auth/middleware/rateLimitByUser.ts:85](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/rateLimitByUser.ts#L85)

#### Parameters

##### config

###### url

`string`

###### prefix?

`string`

###### ttlSeconds?

`number`

###### windowMs?

`number`

When set, TTL will be at least ceil(windowMs/1000) so keys outlive the rate-limit window.

#### Returns

`RedisRateLimitStorage`

## Methods

### getBucket()

> **getBucket**(`userId`): `Promise`\<[`TokenBucket`](../type-aliases/TokenBucket.md) \| `null`\>

Defined in: [auth/middleware/rateLimitByUser.ts:125](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/rateLimitByUser.ts#L125)

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

Defined in: [auth/middleware/rateLimitByUser.ts:142](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/rateLimitByUser.ts#L142)

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

Defined in: [auth/middleware/rateLimitByUser.ts:152](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/rateLimitByUser.ts#L152)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`RateLimitStorage.deleteBucket`

---

### atomicConsume()

> **atomicConsume**(`userId`, `limit`, `windowMs`, `nowMs`): `Promise`\<[`AtomicConsumeResult`](../type-aliases/AtomicConsumeResult.md) \| `null`\>

Defined in: [auth/middleware/rateLimitByUser.ts:169](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/rateLimitByUser.ts#L169)

Atomically refill and consume one token using a Redis Lua script.

The entire read-modify-write cycle runs inside Redis as a single
atomic operation, so two parallel requests for the same user can
never read the same token count.

#### Parameters

##### userId

`string`

##### limit

`number`

##### windowMs

`number`

##### nowMs

`number`

#### Returns

`Promise`\<[`AtomicConsumeResult`](../type-aliases/AtomicConsumeResult.md) \| `null`\>

#### Implementation of

`RateLimitStorage.atomicConsume`

---

### healthCheck()

> **healthCheck**(): `Promise`\<`boolean`\>

Defined in: [auth/middleware/rateLimitByUser.ts:265](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/rateLimitByUser.ts#L265)

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

`RateLimitStorage.healthCheck`

---

### cleanup()

> **cleanup**(): `Promise`\<`void`\>

Defined in: [auth/middleware/rateLimitByUser.ts:275](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/rateLimitByUser.ts#L275)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`RateLimitStorage.cleanup`
