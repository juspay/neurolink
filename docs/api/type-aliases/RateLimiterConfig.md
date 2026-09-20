[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterConfig

# Type Alias: RateLimiterConfig

> **RateLimiterConfig** = `object`

Defined in: [types/config.ts:587](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L587)

Configuration options for the token bucket rate limiter.

## Properties

### maxTokens

> **maxTokens**: `number`

Defined in: [types/config.ts:589](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L589)

Maximum tokens (downloads) allowed per interval

---

### refillIntervalMs

> **refillIntervalMs**: `number`

Defined in: [types/config.ts:591](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L591)

Refill interval in milliseconds

---

### tokensPerRefill

> **tokensPerRefill**: `number`

Defined in: [types/config.ts:593](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L593)

Number of tokens to add per refill interval

---

### maxQueueSize

> **maxQueueSize**: `number`

Defined in: [types/config.ts:595](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L595)

Maximum queue size for pending requests

---

### queueTimeoutMs

> **queueTimeoutMs**: `number`

Defined in: [types/config.ts:597](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L597)

Timeout for queued requests in milliseconds
