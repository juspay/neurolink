[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenBucketRateLimitConfig

# Type Alias: TokenBucketRateLimitConfig

> **TokenBucketRateLimitConfig** = `object`

Defined in: [types/mcp.ts:967](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L967)

Token bucket rate limit configuration options for HTTP transport

## Properties

### requestsPerWindow

> **requestsPerWindow**: `number`

Defined in: [types/mcp.ts:969](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L969)

Maximum requests per window

---

### windowMs

> **windowMs**: `number`

Defined in: [types/mcp.ts:971](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L971)

Window size in milliseconds (default: 60000 = 1 minute)

---

### useTokenBucket

> **useTokenBucket**: `boolean`

Defined in: [types/mcp.ts:973](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L973)

Use token bucket algorithm (default: true)

---

### refillRate

> **refillRate**: `number`

Defined in: [types/mcp.ts:975](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L975)

Token refill rate (tokens per second, for token bucket)

---

### maxBurst

> **maxBurst**: `number`

Defined in: [types/mcp.ts:977](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L977)

Maximum burst size (for token bucket)
