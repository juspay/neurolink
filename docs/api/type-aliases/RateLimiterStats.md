[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterStats

# Type Alias: RateLimiterStats

> **RateLimiterStats** = `object`

Defined in: [types/mcp.ts:1013](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1013)

Rate limiter statistics for monitoring and debugging HTTP transport rate limiting
Provides insight into token bucket state and queue status

## Properties

### tokens

> **tokens**: `number`

Defined in: [types/mcp.ts:1015](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1015)

Current number of available tokens

---

### maxBurst

> **maxBurst**: `number`

Defined in: [types/mcp.ts:1017](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1017)

Maximum burst size (token capacity)

---

### refillRate

> **refillRate**: `number`

Defined in: [types/mcp.ts:1019](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1019)

Token refill rate (tokens per second)

---

### queueLength

> **queueLength**: `number`

Defined in: [types/mcp.ts:1021](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1021)

Number of requests waiting in queue

---

### lastRefill

> **lastRefill**: `Date`

Defined in: [types/mcp.ts:1023](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1023)

Timestamp of last token refill
