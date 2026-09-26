[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenBucketRateLimitConfig

# Type Alias: TokenBucketRateLimitConfig

> **TokenBucketRateLimitConfig** = `object`

Token bucket rate limit configuration options for HTTP transport

## Properties

### requestsPerWindow

> **requestsPerWindow**: `number`

Maximum requests per window

---

### windowMs

> **windowMs**: `number`

Window size in milliseconds (default: 60000 = 1 minute)

---

### useTokenBucket

> **useTokenBucket**: `boolean`

Use token bucket algorithm (default: true)

---

### refillRate

> **refillRate**: `number`

Token refill rate (tokens per second, for token bucket)

---

### maxBurst

> **maxBurst**: `number`

Maximum burst size (for token bucket)
