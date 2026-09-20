[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGRetryConfig

# Type Alias: RAGRetryConfig

> **RAGRetryConfig** = `object`

Defined in: [types/rag.ts:162](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L162)

RAG-specific retry configuration

## Properties

### maxRetries

> **maxRetries**: `number`

Defined in: [types/rag.ts:164](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L164)

Maximum number of retry attempts (default: 3)

---

### initialDelay

> **initialDelay**: `number`

Defined in: [types/rag.ts:166](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L166)

Initial delay in ms (default: 1000)

---

### maxDelay

> **maxDelay**: `number`

Defined in: [types/rag.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L168)

Maximum delay in ms (default: 30000)

---

### backoffMultiplier

> **backoffMultiplier**: `number`

Defined in: [types/rag.ts:170](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L170)

Backoff multiplier (default: 2)

---

### jitter

> **jitter**: `boolean`

Defined in: [types/rag.ts:172](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L172)

Whether to add jitter (default: true)

---

### shouldRetry?

> `optional` **shouldRetry?**: (`error`) => `boolean`

Defined in: [types/rag.ts:182](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L182)

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

Defined in: [types/rag.ts:184](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L184)

Retryable error codes

---

### retryableStatusCodes?

> `optional` **retryableStatusCodes?**: `number`[]

Defined in: [types/rag.ts:186](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L186)

Retryable HTTP status codes
