[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenBucketRateLimitConfig

# Type Alias: TokenBucketRateLimitConfig

> **TokenBucketRateLimitConfig** = `object`

Defined in: [types/mcp.ts:948](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L948)

Token bucket rate limit configuration options for HTTP transport

## Properties

### requestsPerWindow

> **requestsPerWindow**: `number`

Defined in: [types/mcp.ts:950](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L950)

Maximum requests per window

---

### windowMs

> **windowMs**: `number`

Defined in: [types/mcp.ts:952](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L952)

Window size in milliseconds (default: 60000 = 1 minute)

---

### useTokenBucket

> **useTokenBucket**: `boolean`

Defined in: [types/mcp.ts:954](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L954)

Use token bucket algorithm (default: true)

---

### refillRate

> **refillRate**: `number`

Defined in: [types/mcp.ts:956](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L956)

Token refill rate (tokens per second, for token bucket)

---

### maxBurst

> **maxBurst**: `number`

Defined in: [types/mcp.ts:958](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L958)

Maximum burst size (for token bucket)
