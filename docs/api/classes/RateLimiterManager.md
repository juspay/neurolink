[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterManager

# Class: RateLimiterManager

Defined in: [mcp/httpRateLimiter.ts:350](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/httpRateLimiter.ts#L350)

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

Defined in: [mcp/httpRateLimiter.ts:360](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/httpRateLimiter.ts#L360)

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

Defined in: [mcp/httpRateLimiter.ts:387](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/httpRateLimiter.ts#L387)

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

Defined in: [mcp/httpRateLimiter.ts:396](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/httpRateLimiter.ts#L396)

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

Defined in: [mcp/httpRateLimiter.ts:413](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/httpRateLimiter.ts#L413)

Get all server IDs with active rate limiters

#### Returns

`string`[]

Array of server IDs

---

### getAllStats()

> **getAllStats**(): `Record`\<`string`, [`RateLimiterStats`](../type-aliases/RateLimiterStats.md)\>

Defined in: [mcp/httpRateLimiter.ts:422](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/httpRateLimiter.ts#L422)

Get statistics for all rate limiters

#### Returns

`Record`\<`string`, [`RateLimiterStats`](../type-aliases/RateLimiterStats.md)\>

Record of server IDs to their rate limiter statistics

---

### resetAll()

> **resetAll**(): `void`

Defined in: [mcp/httpRateLimiter.ts:435](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/httpRateLimiter.ts#L435)

Reset all rate limiters

#### Returns

`void`

---

### destroyAll()

> **destroyAll**(): `void`

Defined in: [mcp/httpRateLimiter.ts:447](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/httpRateLimiter.ts#L447)

Destroy all rate limiters and clean up resources
This should be called during application shutdown

#### Returns

`void`

---

### getHealthSummary()

> **getHealthSummary**(): `object`

Defined in: [mcp/httpRateLimiter.ts:459](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/httpRateLimiter.ts#L459)

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
