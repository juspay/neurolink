[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterConfig

# Type Alias: RateLimiterConfig

> **RateLimiterConfig** = `object`

Defined in: [types/config.ts:575](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L575)

Configuration options for the token bucket rate limiter.

## Properties

### maxTokens

> **maxTokens**: `number`

Defined in: [types/config.ts:577](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L577)

Maximum tokens (downloads) allowed per interval

---

### refillIntervalMs

> **refillIntervalMs**: `number`

Defined in: [types/config.ts:579](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L579)

Refill interval in milliseconds

---

### tokensPerRefill

> **tokensPerRefill**: `number`

Defined in: [types/config.ts:581](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L581)

Number of tokens to add per refill interval

---

### maxQueueSize

> **maxQueueSize**: `number`

Defined in: [types/config.ts:583](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L583)

Maximum queue size for pending requests

---

### queueTimeoutMs

> **queueTimeoutMs**: `number`

Defined in: [types/config.ts:585](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L585)

Timeout for queued requests in milliseconds
