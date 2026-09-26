[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorRetryConfig

# Type Alias: ProcessorRetryConfig

> **ProcessorRetryConfig** = `object`

Configuration for retry behavior on transient failures.
Implements exponential backoff with optional custom retry predicate.

## Properties

### maxRetries

> **maxRetries**: `number`

Maximum number of retry attempts

---

### baseDelayMs

> **baseDelayMs**: `number`

Base delay between retries in milliseconds

---

### maxDelayMs

> **maxDelayMs**: `number`

Maximum delay between retries in milliseconds

---

### retryOn?

> `optional` **retryOn?**: (`error`) => `boolean`

Optional custom function to determine if an error is retryable

#### Parameters

##### error

`Error`

#### Returns

`boolean`
