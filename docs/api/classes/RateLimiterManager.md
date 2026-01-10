[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterManager

# Class: RateLimiterManager

Defined in: [mcp/httpRateLimiter.ts:314](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/httpRateLimiter.ts#L314)

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

Defined in: [mcp/httpRateLimiter.ts:324](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/httpRateLimiter.ts#L324)

Get or create a rate limiter for a server

#### Parameters

##### serverId

`string`

Unique identifier for the server

##### config?

`Partial`\<`TokenBucketRateLimitConfig`\>

Optional configuration for the rate limiter

#### Returns

[`HTTPRateLimiter`](HTTPRateLimiter.md)

HTTPRateLimiter instance for the server

---

### hasLimiter()

> **hasLimiter**(`serverId`): `boolean`

Defined in: [mcp/httpRateLimiter.ts:351](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/httpRateLimiter.ts#L351)

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

Defined in: [mcp/httpRateLimiter.ts:360](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/httpRateLimiter.ts#L360)

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

Defined in: [mcp/httpRateLimiter.ts:377](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/httpRateLimiter.ts#L377)

Get all server IDs with active rate limiters

#### Returns

`string`[]

Array of server IDs

---

### getAllStats()

> **getAllStats**(): `Record`\<`string`, `RateLimiterStats`\>

Defined in: [mcp/httpRateLimiter.ts:386](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/httpRateLimiter.ts#L386)

Get statistics for all rate limiters

#### Returns

`Record`\<`string`, `RateLimiterStats`\>

Record of server IDs to their rate limiter statistics

---

### resetAll()

> **resetAll**(): `void`

Defined in: [mcp/httpRateLimiter.ts:399](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/httpRateLimiter.ts#L399)

Reset all rate limiters

#### Returns

`void`

---

### destroyAll()

> **destroyAll**(): `void`

Defined in: [mcp/httpRateLimiter.ts:411](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/httpRateLimiter.ts#L411)

Destroy all rate limiters and clean up resources
This should be called during application shutdown

#### Returns

`void`

---

### getHealthSummary()

> **getHealthSummary**(): `object`

Defined in: [mcp/httpRateLimiter.ts:423](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/httpRateLimiter.ts#L423)

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
