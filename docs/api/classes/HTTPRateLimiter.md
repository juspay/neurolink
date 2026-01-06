[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / HTTPRateLimiter

# Class: HTTPRateLimiter

Defined in: [mcp/httpRateLimiter.ts:32](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/httpRateLimiter.ts#L32)

HTTPRateLimiter
Implements token bucket algorithm for rate limiting HTTP requests

The token bucket algorithm works as follows:

- Tokens are added to the bucket at a fixed rate (refillRate per second)
- Each request consumes one token
- If no tokens are available, the request must wait
- Maximum tokens are capped at maxBurst to allow controlled bursting

## Constructors

### Constructor

> **new HTTPRateLimiter**(`config`): `HTTPRateLimiter`

Defined in: [mcp/httpRateLimiter.ts:42](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/httpRateLimiter.ts#L42)

#### Parameters

##### config

`Partial`\<[`RateLimitConfig`](../type-aliases/RateLimitConfig.md)\> = `{}`

#### Returns

`HTTPRateLimiter`

## Methods

### acquire()

> **acquire**(): `Promise`\<`void`\>

Defined in: [mcp/httpRateLimiter.ts:89](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/httpRateLimiter.ts#L89)

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

Defined in: [mcp/httpRateLimiter.ts:163](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/httpRateLimiter.ts#L163)

Try to acquire a token without waiting

#### Returns

`boolean`

true if a token was acquired, false otherwise

---

### handleRateLimitResponse()

> **handleRateLimitResponse**(`headers`): `number`

Defined in: [mcp/httpRateLimiter.ts:189](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/httpRateLimiter.ts#L189)

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

Defined in: [mcp/httpRateLimiter.ts:252](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/httpRateLimiter.ts#L252)

Get the number of remaining tokens

#### Returns

`number`

Current number of available tokens

---

### reset()

> **reset**(): `void`

Defined in: [mcp/httpRateLimiter.ts:261](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/httpRateLimiter.ts#L261)

Reset the rate limiter to initial state
Useful for testing or when server indicates rate limits have been reset

#### Returns

`void`

---

### getStats()

> **getStats**(): `RateLimiterStats`

Defined in: [mcp/httpRateLimiter.ts:281](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/httpRateLimiter.ts#L281)

Get current rate limiter statistics

#### Returns

`RateLimiterStats`

---

### updateConfig()

> **updateConfig**(`config`): `void`

Defined in: [mcp/httpRateLimiter.ts:296](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/httpRateLimiter.ts#L296)

Update configuration dynamically
Useful when server provides rate limit information

#### Parameters

##### config

`Partial`\<[`RateLimitConfig`](../type-aliases/RateLimitConfig.md)\>

#### Returns

`void`

---

### getConfig()

> **getConfig**(): `Readonly`\<[`RateLimitConfig`](../type-aliases/RateLimitConfig.md)\>

Defined in: [mcp/httpRateLimiter.ts:304](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/httpRateLimiter.ts#L304)

Get current configuration

#### Returns

`Readonly`\<[`RateLimitConfig`](../type-aliases/RateLimitConfig.md)\>
