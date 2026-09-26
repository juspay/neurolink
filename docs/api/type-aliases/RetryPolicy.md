[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RetryPolicy

# Type Alias: RetryPolicy

> **RetryPolicy** = `object`

Retry policy type for observability exporters.

## Properties

### name

> `readonly` **name**: `string`

Policy name for identification

---

### maxAttempts

> `readonly` **maxAttempts**: `number`

Maximum attempts allowed

---

### maxTotalTimeMs

> `readonly` **maxTotalTimeMs**: `number`

Maximum total time allowed for retries

## Methods

### shouldRetry()

> **shouldRetry**(`context`): [`RetryDecision`](RetryDecision.md)

Decide whether to retry

#### Parameters

##### context

[`RetryContext`](RetryContext.md)

#### Returns

[`RetryDecision`](RetryDecision.md)
