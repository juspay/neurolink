[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RedisRateLimitStorage

# Class: RedisRateLimitStorage

Redis-backed storage for rate limiting (distributed deployments)

## Implements

- [`RateLimitStorage`](../type-aliases/RateLimitStorage.md)

## Constructors

### Constructor

> **new RedisRateLimitStorage**(`config`): `RedisRateLimitStorage`

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

### atomicConsume()

> **atomicConsume**(`userId`, `limit`, `windowMs`, `nowMs`): `Promise`\<[`AtomicConsumeResult`](../type-aliases/AtomicConsumeResult.md) \| `null`\>

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
