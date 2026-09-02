[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterConfig

# Type Alias: RateLimiterConfig

> **RateLimiterConfig** = `object`

Defined in: [types/config.ts:568](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L568)

Configuration options for the token bucket rate limiter.

## Properties

### maxTokens

> **maxTokens**: `number`

Defined in: [types/config.ts:570](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L570)

Maximum tokens (downloads) allowed per interval

---

### refillIntervalMs

> **refillIntervalMs**: `number`

Defined in: [types/config.ts:572](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L572)

Refill interval in milliseconds

---

### tokensPerRefill

> **tokensPerRefill**: `number`

Defined in: [types/config.ts:574](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L574)

Number of tokens to add per refill interval

---

### maxQueueSize

> **maxQueueSize**: `number`

Defined in: [types/config.ts:576](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L576)

Maximum queue size for pending requests

---

### queueTimeoutMs

> **queueTimeoutMs**: `number`

Defined in: [types/config.ts:578](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L578)

Timeout for queued requests in milliseconds
