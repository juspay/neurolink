[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterConfig

# Type Alias: RateLimiterConfig

> **RateLimiterConfig** = `object`

Defined in: [types/config.ts:565](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L565)

Configuration options for the token bucket rate limiter.

## Properties

### maxTokens

> **maxTokens**: `number`

Defined in: [types/config.ts:567](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L567)

Maximum tokens (downloads) allowed per interval

---

### refillIntervalMs

> **refillIntervalMs**: `number`

Defined in: [types/config.ts:569](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L569)

Refill interval in milliseconds

---

### tokensPerRefill

> **tokensPerRefill**: `number`

Defined in: [types/config.ts:571](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L571)

Number of tokens to add per refill interval

---

### maxQueueSize

> **maxQueueSize**: `number`

Defined in: [types/config.ts:573](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L573)

Maximum queue size for pending requests

---

### queueTimeoutMs

> **queueTimeoutMs**: `number`

Defined in: [types/config.ts:575](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L575)

Timeout for queued requests in milliseconds
