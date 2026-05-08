[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterStats

# Type Alias: RateLimiterStats

> **RateLimiterStats** = `object`

Defined in: [types/mcp.ts:975](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L975)

Rate limiter statistics for monitoring and debugging HTTP transport rate limiting
Provides insight into token bucket state and queue status

## Properties

### tokens

> **tokens**: `number`

Defined in: [types/mcp.ts:977](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L977)

Current number of available tokens

---

### maxBurst

> **maxBurst**: `number`

Defined in: [types/mcp.ts:979](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L979)

Maximum burst size (token capacity)

---

### refillRate

> **refillRate**: `number`

Defined in: [types/mcp.ts:981](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L981)

Token refill rate (tokens per second)

---

### queueLength

> **queueLength**: `number`

Defined in: [types/mcp.ts:983](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L983)

Number of requests waiting in queue

---

### lastRefill

> **lastRefill**: `Date`

Defined in: [types/mcp.ts:985](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L985)

Timestamp of last token refill
