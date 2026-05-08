[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / HTTPRateLimiter

# Class: HTTPRateLimiter

Defined in: [mcp/httpRateLimiter.ts:41](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRateLimiter.ts#L41)

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

Defined in: [mcp/httpRateLimiter.ts:51](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRateLimiter.ts#L51)

#### Parameters

##### config?

`Partial`\<[`TokenBucketRateLimitConfig`](../type-aliases/TokenBucketRateLimitConfig.md)\> = `{}`

#### Returns

`HTTPRateLimiter`

## Methods

### acquire()

> **acquire**(): `Promise`\<`void`\>

Defined in: [mcp/httpRateLimiter.ts:98](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRateLimiter.ts#L98)

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

Defined in: [mcp/httpRateLimiter.ts:205](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRateLimiter.ts#L205)

Try to acquire a token without waiting

#### Returns

`boolean`

true if a token was acquired, false otherwise

---

### handleRateLimitResponse()

> **handleRateLimitResponse**(`headers`): `number`

Defined in: [mcp/httpRateLimiter.ts:231](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRateLimiter.ts#L231)

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

Defined in: [mcp/httpRateLimiter.ts:294](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRateLimiter.ts#L294)

Get the number of remaining tokens

#### Returns

`number`

Current number of available tokens

---

### reset()

> **reset**(): `void`

Defined in: [mcp/httpRateLimiter.ts:303](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRateLimiter.ts#L303)

Reset the rate limiter to initial state
Useful for testing or when server indicates rate limits have been reset

#### Returns

`void`

---

### getStats()

> **getStats**(): [`RateLimiterStats`](../type-aliases/RateLimiterStats.md)

Defined in: [mcp/httpRateLimiter.ts:323](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRateLimiter.ts#L323)

Get current rate limiter statistics

#### Returns

[`RateLimiterStats`](../type-aliases/RateLimiterStats.md)

---

### updateConfig()

> **updateConfig**(`config`): `void`

Defined in: [mcp/httpRateLimiter.ts:338](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRateLimiter.ts#L338)

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

Defined in: [mcp/httpRateLimiter.ts:346](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRateLimiter.ts#L346)

Get current configuration

#### Returns

`Readonly`\<[`TokenBucketRateLimitConfig`](../type-aliases/TokenBucketRateLimitConfig.md)\>
