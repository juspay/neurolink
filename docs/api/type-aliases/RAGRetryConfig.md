[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGRetryConfig

# Type Alias: RAGRetryConfig

> **RAGRetryConfig** = `object`

RAG-specific retry configuration

## Properties

### maxRetries

> **maxRetries**: `number`

Maximum number of retry attempts (default: 3)

---

### initialDelay

> **initialDelay**: `number`

Initial delay in ms (default: 1000)

---

### maxDelay

> **maxDelay**: `number`

Maximum delay in ms (default: 30000)

---

### backoffMultiplier

> **backoffMultiplier**: `number`

Backoff multiplier (default: 2)

---

### jitter

> **jitter**: `boolean`

Whether to add jitter (default: true)

---

### shouldRetry?

> `optional` **shouldRetry?**: (`error`) => `boolean`

Custom function to determine if error is retryable.

Note: In `isRetryable()`, this callback is invoked _before_ the built-in
abort-error check. If you provide a custom `shouldRetry`, it should
explicitly handle abort errors (e.g. return `false` for them) when
cancellation correctness is required. Otherwise an aborted operation
could be retried instead of propagating immediately.

#### Parameters

##### error

`Error`

#### Returns

`boolean`

---

### retryableErrorCodes?

> `optional` **retryableErrorCodes?**: `string`[]

Retryable error codes

---

### retryableStatusCodes?

> `optional` **retryableStatusCodes?**: `number`[]

Retryable HTTP status codes
