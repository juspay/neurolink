[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientRetryConfig

# Type Alias: ClientRetryConfig

> **ClientRetryConfig** = `object`

Retry configuration for failed requests

## Properties

### maxAttempts

> **maxAttempts**: `number`

Maximum number of retry attempts (default: 3)

---

### initialDelayMs

> **initialDelayMs**: `number`

Initial delay in milliseconds before first retry (default: 1000)

---

### maxDelayMs

> **maxDelayMs**: `number`

Maximum delay in milliseconds between retries (default: 10000)

---

### backoffMultiplier

> **backoffMultiplier**: `number`

Backoff multiplier for exponential backoff (default: 2)

---

### retryableStatusCodes?

> `optional` **retryableStatusCodes?**: `number`[]

HTTP status codes to retry on (default: [408, 429, 500, 502, 503, 504])

---

### retryOnNetworkError?

> `optional` **retryOnNetworkError?**: `boolean`

Whether to retry on network errors (default: true)
