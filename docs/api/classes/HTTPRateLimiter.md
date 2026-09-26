[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HTTPRateLimiter

# Class: HTTPRateLimiter

HTTPRateLimiter
Implements token bucket algorithm for rate limiting HTTP requests

The token bucket algorithm works as follows:

- Tokens are added to the bucket at a fixed rate (refillRate per second)
- Each request consumes one token
- If no tokens are available, the request must wait
- Maximum tokens are capped at maxBurst to allow controlled bursting

## Constructors

### Constructor

> **new HTTPRateLimiter**(`config?`): `HTTPRateLimiter`

#### Parameters

##### config?

`Partial`\<[`TokenBucketRateLimitConfig`](../type-aliases/TokenBucketRateLimitConfig.md)\> = `{}`

#### Returns

`HTTPRateLimiter`

## Methods

### acquire()

> **acquire**(): `Promise`\<`void`\>

Acquire a token, waiting if necessary
This is the primary method for rate-limited operations

#### Returns

`Promise`\<`void`\>

Promise that resolves when a token is acquired

#### Throws

Error if the wait queue is too long

---

### tryAcquire()

> **tryAcquire**(): `boolean`

Try to acquire a token without waiting

#### Returns

`boolean`

true if a token was acquired, false otherwise

---

### handleRateLimitResponse()

> **handleRateLimitResponse**(`headers`): `number`

Handle rate limit response headers from server
Parses Retry-After header and returns wait time in milliseconds

#### Parameters

##### headers

`Headers`

Response headers from the server

#### Returns

`number`

Wait time in milliseconds, or 0 if no rate limit headers found

---

### getRemainingTokens()

> **getRemainingTokens**(): `number`

Get the number of remaining tokens

#### Returns

`number`

Current number of available tokens

---

### reset()

> **reset**(): `void`

Reset the rate limiter to initial state
Useful for testing or when server indicates rate limits have been reset

#### Returns

`void`

---

### getStats()

> **getStats**(): [`RateLimiterStats`](../type-aliases/RateLimiterStats.md)

Get current rate limiter statistics

#### Returns

[`RateLimiterStats`](../type-aliases/RateLimiterStats.md)

---

### updateConfig()

> **updateConfig**(`config`): `void`

Update configuration dynamically
Useful when server provides rate limit information

#### Parameters

##### config

`Partial`\<[`TokenBucketRateLimitConfig`](../type-aliases/TokenBucketRateLimitConfig.md)\>

#### Returns

`void`

---

### getConfig()

> **getConfig**(): `Readonly`\<[`TokenBucketRateLimitConfig`](../type-aliases/TokenBucketRateLimitConfig.md)\>

Get current configuration

#### Returns

`Readonly`\<[`TokenBucketRateLimitConfig`](../type-aliases/TokenBucketRateLimitConfig.md)\>
