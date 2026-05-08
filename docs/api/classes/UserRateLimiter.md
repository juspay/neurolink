[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / UserRateLimiter

# Class: UserRateLimiter

Defined in: [auth/middleware/rateLimitByUser.ts:293](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/rateLimitByUser.ts#L293)

Token bucket rate limiter implementation

Uses the token bucket algorithm which allows for burst traffic while
maintaining an average rate limit. Tokens are continuously added to
the bucket at a fixed rate, and each request consumes one token.

## Constructors

### Constructor

> **new UserRateLimiter**(`config`, `storage?`): `UserRateLimiter`

Defined in: [auth/middleware/rateLimitByUser.ts:297](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/rateLimitByUser.ts#L297)

#### Parameters

##### config

[`AuthRateLimitConfig`](../type-aliases/AuthRateLimitConfig.md)

##### storage?

[`RateLimitStorage`](../type-aliases/RateLimitStorage.md)

#### Returns

`UserRateLimiter`

## Methods

### consume()

> **consume**(`user`): `Promise`\<[`RateLimitResult`](../type-aliases/RateLimitResult.md)\>

Defined in: [auth/middleware/rateLimitByUser.ts:355](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/rateLimitByUser.ts#L355)

Consume a token from the user's bucket
Returns the rate limit result

When the storage backend supports `atomicConsume` (e.g. Redis with Lua),
the entire refill-and-consume is executed as a single atomic operation,
preventing race conditions where parallel requests both read the same
token count and both succeed.

#### Parameters

##### user

[`AuthUser`](../type-aliases/AuthUser.md)

#### Returns

`Promise`\<[`RateLimitResult`](../type-aliases/RateLimitResult.md)\>

---

### getStatus()

> **getStatus**(`user`): `Promise`\<[`RateLimitResult`](../type-aliases/RateLimitResult.md)\>

Defined in: [auth/middleware/rateLimitByUser.ts:462](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/rateLimitByUser.ts#L462)

Get current rate limit status for a user without consuming a token

#### Parameters

##### user

[`AuthUser`](../type-aliases/AuthUser.md)

#### Returns

`Promise`\<[`RateLimitResult`](../type-aliases/RateLimitResult.md)\>

---

### resetUser()

> **resetUser**(`userId`): `Promise`\<`void`\>

Defined in: [auth/middleware/rateLimitByUser.ts:504](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/rateLimitByUser.ts#L504)

Reset rate limit for a user (admin action)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

---

### healthCheck()

> **healthCheck**(): `Promise`\<`boolean`\>

Defined in: [auth/middleware/rateLimitByUser.ts:512](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/rateLimitByUser.ts#L512)

Check storage health

#### Returns

`Promise`\<`boolean`\>

---

### cleanup()

> **cleanup**(): `Promise`\<`void`\>

Defined in: [auth/middleware/rateLimitByUser.ts:519](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/middleware/rateLimitByUser.ts#L519)

Cleanup resources

#### Returns

`Promise`\<`void`\>
