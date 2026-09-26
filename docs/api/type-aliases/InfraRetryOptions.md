[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InfraRetryOptions

# Type Alias: InfraRetryOptions

> **InfraRetryOptions** = `object`

Simple retry options for infrastructure-level retry logic.
Named InfraRetryOptions to avoid collision with utilities.ts RetryOptions and
common.ts AsyncRetryOptions.

## Properties

### maxRetries

> **maxRetries**: `number`

---

### baseDelayMs

> **baseDelayMs**: `number`

---

### maxDelayMs?

> `optional` **maxDelayMs?**: `number`

---

### shouldRetry?

> `optional` **shouldRetry?**: (`error`) => `boolean`

#### Parameters

##### error

`Error`

#### Returns

`boolean`
