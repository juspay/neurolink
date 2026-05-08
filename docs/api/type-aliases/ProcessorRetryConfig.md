[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorRetryConfig

# Type Alias: ProcessorRetryConfig

> **ProcessorRetryConfig** = `object`

Defined in: [types/processor.ts:167](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L167)

Configuration for retry behavior on transient failures.
Implements exponential backoff with optional custom retry predicate.

## Properties

### maxRetries

> **maxRetries**: `number`

Defined in: [types/processor.ts:169](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L169)

Maximum number of retry attempts

---

### baseDelayMs

> **baseDelayMs**: `number`

Defined in: [types/processor.ts:171](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L171)

Base delay between retries in milliseconds

---

### maxDelayMs

> **maxDelayMs**: `number`

Defined in: [types/processor.ts:173](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L173)

Maximum delay between retries in milliseconds

---

### retryOn?

> `optional` **retryOn?**: (`error`) => `boolean`

Defined in: [types/processor.ts:175](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L175)

Optional custom function to determine if an error is retryable

#### Parameters

##### error

`Error`

#### Returns

`boolean`
