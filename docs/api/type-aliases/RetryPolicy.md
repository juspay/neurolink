[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RetryPolicy

# Type Alias: RetryPolicy

> **RetryPolicy** = `object`

Defined in: [types/observability.ts:203](https://github.com/juspay/neurolink/blob/release/src/lib/types/observability.ts#L203)

Retry policy type for observability exporters.

## Properties

### name

> `readonly` **name**: `string`

Defined in: [types/observability.ts:205](https://github.com/juspay/neurolink/blob/release/src/lib/types/observability.ts#L205)

Policy name for identification

---

### maxAttempts

> `readonly` **maxAttempts**: `number`

Defined in: [types/observability.ts:211](https://github.com/juspay/neurolink/blob/release/src/lib/types/observability.ts#L211)

Maximum attempts allowed

---

### maxTotalTimeMs

> `readonly` **maxTotalTimeMs**: `number`

Defined in: [types/observability.ts:214](https://github.com/juspay/neurolink/blob/release/src/lib/types/observability.ts#L214)

Maximum total time allowed for retries

## Methods

### shouldRetry()

> **shouldRetry**(`context`): [`RetryDecision`](RetryDecision.md)

Defined in: [types/observability.ts:208](https://github.com/juspay/neurolink/blob/release/src/lib/types/observability.ts#L208)

Decide whether to retry

#### Parameters

##### context

[`RetryContext`](RetryContext.md)

#### Returns

[`RetryDecision`](RetryDecision.md)
