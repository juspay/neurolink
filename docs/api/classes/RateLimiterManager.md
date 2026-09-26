[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterManager

# Class: RateLimiterManager

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

Get all server IDs with active rate limiters

#### Returns

`string`[]

Array of server IDs

---

### getAllStats()

> **getAllStats**(): `Record`\<`string`, [`RateLimiterStats`](../type-aliases/RateLimiterStats.md)\>

Get statistics for all rate limiters

#### Returns

`Record`\<`string`, [`RateLimiterStats`](../type-aliases/RateLimiterStats.md)\>

Record of server IDs to their rate limiter statistics

---

### resetAll()

> **resetAll**(): `void`

Reset all rate limiters

#### Returns

`void`

---

### destroyAll()

> **destroyAll**(): `void`

Destroy all rate limiters and clean up resources
This should be called during application shutdown

#### Returns

`void`

---

### getHealthSummary()

> **getHealthSummary**(): `object`

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
