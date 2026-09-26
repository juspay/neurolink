[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterConfig

# Type Alias: RateLimiterConfig

> **RateLimiterConfig** = `object`

Defined in: [types/config.ts:596](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L596)

Configuration options for the token bucket rate limiter.

## Properties

### maxTokens

> **maxTokens**: `number`

Defined in: [types/config.ts:598](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L598)

Maximum tokens (downloads) allowed per interval

---

### refillIntervalMs

> **refillIntervalMs**: `number`

Defined in: [types/config.ts:600](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L600)

Refill interval in milliseconds

---

### tokensPerRefill

> **tokensPerRefill**: `number`

Defined in: [types/config.ts:602](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L602)

Number of tokens to add per refill interval

---

### maxQueueSize

> **maxQueueSize**: `number`

Defined in: [types/config.ts:604](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L604)

Maximum queue size for pending requests

---

### queueTimeoutMs

> **queueTimeoutMs**: `number`

Defined in: [types/config.ts:606](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L606)

Timeout for queued requests in milliseconds
