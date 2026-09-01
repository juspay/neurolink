[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterStats

# Type Alias: RateLimiterStats

> **RateLimiterStats** = `object`

Defined in: [types/mcp.ts:994](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L994)

Rate limiter statistics for monitoring and debugging HTTP transport rate limiting
Provides insight into token bucket state and queue status

## Properties

### tokens

> **tokens**: `number`

Defined in: [types/mcp.ts:996](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L996)

Current number of available tokens

---

### maxBurst

> **maxBurst**: `number`

Defined in: [types/mcp.ts:998](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L998)

Maximum burst size (token capacity)

---

### refillRate

> **refillRate**: `number`

Defined in: [types/mcp.ts:1000](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1000)

Token refill rate (tokens per second)

---

### queueLength

> **queueLength**: `number`

Defined in: [types/mcp.ts:1002](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1002)

Number of requests waiting in queue

---

### lastRefill

> **lastRefill**: `Date`

Defined in: [types/mcp.ts:1004](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1004)

Timestamp of last token refill
