[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterManager

# Class: RateLimiterManager

Defined in: [mcp/httpRateLimiter.ts:356](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRateLimiter.ts#L356)

RateLimiterManager
Manages multiple rate limiters for different servers
Each server can have its own rate limiting configuration

## Constructors

### Constructor

> **new RateLimiterManager**(): `RateLimiterManager`

#### Returns

`RateLimiterManager`

## Methods

### getLimiter()

> **getLimiter**(`serverId`, `config?`): [`HTTPRateLimiter`](HTTPRateLimiter.md)

Defined in: [mcp/httpRateLimiter.ts:366](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRateLimiter.ts#L366)

Get or create a rate limiter for a server

#### Parameters

##### serverId

`string`

Unique identifier for the server

##### config?

`Partial`\<[`TokenBucketRateLimitConfig`](../type-aliases/TokenBucketRateLimitConfig.md)\>

Optional configuration for the rate limiter

#### Returns

[`HTTPRateLimiter`](HTTPRateLimiter.md)

HTTPRateLimiter instance for the server

---

### hasLimiter()

> **hasLimiter**(`serverId`): `boolean`

Defined in: [mcp/httpRateLimiter.ts:393](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRateLimiter.ts#L393)

Check if a rate limiter exists for a server

#### Parameters

##### serverId

`string`

Unique identifier for the server

#### Returns

`boolean`

true if a rate limiter exists for the server

---

### removeLimiter()

> **removeLimiter**(`serverId`): `void`

Defined in: [mcp/httpRateLimiter.ts:402](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRateLimiter.ts#L402)

Remove a rate limiter for a server

#### Parameters

##### serverId

`string`

Unique identifier for the server

#### Returns

`void`

---

### getServerIds()

> **getServerIds**(): `string`[]

Defined in: [mcp/httpRateLimiter.ts:419](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRateLimiter.ts#L419)

Get all server IDs with active rate limiters

#### Returns

`string`[]

Array of server IDs

---

### getAllStats()

> **getAllStats**(): `Record`\<`string`, [`RateLimiterStats`](../type-aliases/RateLimiterStats.md)\>

Defined in: [mcp/httpRateLimiter.ts:428](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRateLimiter.ts#L428)

Get statistics for all rate limiters

#### Returns

`Record`\<`string`, [`RateLimiterStats`](../type-aliases/RateLimiterStats.md)\>

Record of server IDs to their rate limiter statistics

---

### resetAll()

> **resetAll**(): `void`

Defined in: [mcp/httpRateLimiter.ts:441](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRateLimiter.ts#L441)

Reset all rate limiters

#### Returns

`void`

---

### destroyAll()

> **destroyAll**(): `void`

Defined in: [mcp/httpRateLimiter.ts:453](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRateLimiter.ts#L453)

Destroy all rate limiters and clean up resources
This should be called during application shutdown

#### Returns

`void`

---

### getHealthSummary()

> **getHealthSummary**(): `object`

Defined in: [mcp/httpRateLimiter.ts:465](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/httpRateLimiter.ts#L465)

Get health summary for all rate limiters

#### Returns

`object`

##### totalLimiters

> **totalLimiters**: `number`

##### serversWithQueuedRequests

> **serversWithQueuedRequests**: `string`[]

##### totalQueuedRequests

> **totalQueuedRequests**: `number`

##### averageTokensAvailable

> **averageTokensAvailable**: `number`
