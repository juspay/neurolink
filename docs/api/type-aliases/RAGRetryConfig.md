[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGRetryConfig

# Type Alias: RAGRetryConfig

> **RAGRetryConfig** = `object`

Defined in: [types/rag.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L161)

RAG-specific retry configuration

## Properties

### maxRetries

> **maxRetries**: `number`

Defined in: [types/rag.ts:163](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L163)

Maximum number of retry attempts (default: 3)

---

### initialDelay

> **initialDelay**: `number`

Defined in: [types/rag.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L165)

Initial delay in ms (default: 1000)

---

### maxDelay

> **maxDelay**: `number`

Defined in: [types/rag.ts:167](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L167)

Maximum delay in ms (default: 30000)

---

### backoffMultiplier

> **backoffMultiplier**: `number`

Defined in: [types/rag.ts:169](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L169)

Backoff multiplier (default: 2)

---

### jitter

> **jitter**: `boolean`

Defined in: [types/rag.ts:171](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L171)

Whether to add jitter (default: true)

---

### shouldRetry?

> `optional` **shouldRetry?**: (`error`) => `boolean`

Defined in: [types/rag.ts:181](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L181)

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

Defined in: [types/rag.ts:183](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L183)

Retryable error codes

---

### retryableStatusCodes?

> `optional` **retryableStatusCodes?**: `number`[]

Defined in: [types/rag.ts:185](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L185)

Retryable HTTP status codes
