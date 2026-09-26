[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterConfig

# Type Alias: RateLimiterConfig

> **RateLimiterConfig** = `object`

Configuration options for the token bucket rate limiter.

## Properties

### maxTokens

> **maxTokens**: `number`

Maximum tokens (downloads) allowed per interval

---

### refillIntervalMs

> **refillIntervalMs**: `number`

Refill interval in milliseconds

---

### tokensPerRefill

> **tokensPerRefill**: `number`

Number of tokens to add per refill interval

---

### maxQueueSize

> **maxQueueSize**: `number`

Maximum queue size for pending requests

---

### queueTimeoutMs

> **queueTimeoutMs**: `number`

Timeout for queued requests in milliseconds
