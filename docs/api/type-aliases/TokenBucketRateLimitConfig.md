[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenBucketRateLimitConfig

# Type Alias: TokenBucketRateLimitConfig

> **TokenBucketRateLimitConfig** = `object`

Defined in: [types/mcp.ts:929](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L929)

Token bucket rate limit configuration options for HTTP transport

## Properties

### requestsPerWindow

> **requestsPerWindow**: `number`

Defined in: [types/mcp.ts:931](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L931)

Maximum requests per window

---

### windowMs

> **windowMs**: `number`

Defined in: [types/mcp.ts:933](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L933)

Window size in milliseconds (default: 60000 = 1 minute)

---

### useTokenBucket

> **useTokenBucket**: `boolean`

Defined in: [types/mcp.ts:935](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L935)

Use token bucket algorithm (default: true)

---

### refillRate

> **refillRate**: `number`

Defined in: [types/mcp.ts:937](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L937)

Token refill rate (tokens per second, for token bucket)

---

### maxBurst

> **maxBurst**: `number`

Defined in: [types/mcp.ts:939](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L939)

Maximum burst size (for token bucket)
