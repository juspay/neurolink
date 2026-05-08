[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterConfig

# Type Alias: RateLimiterConfig

> **RateLimiterConfig** = `object`

Defined in: [types/config.ts:432](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L432)

Configuration options for the token bucket rate limiter.

## Properties

### maxTokens

> **maxTokens**: `number`

Defined in: [types/config.ts:434](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L434)

Maximum tokens (downloads) allowed per interval

---

### refillIntervalMs

> **refillIntervalMs**: `number`

Defined in: [types/config.ts:436](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L436)

Refill interval in milliseconds

---

### tokensPerRefill

> **tokensPerRefill**: `number`

Defined in: [types/config.ts:438](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L438)

Number of tokens to add per refill interval

---

### maxQueueSize

> **maxQueueSize**: `number`

Defined in: [types/config.ts:440](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L440)

Maximum queue size for pending requests

---

### queueTimeoutMs

> **queueTimeoutMs**: `number`

Defined in: [types/config.ts:442](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L442)

Timeout for queued requests in milliseconds
