[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InfraRetryOptions

# Type Alias: InfraRetryOptions

> **InfraRetryOptions** = `object`

Defined in: [types/common.ts:324](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L324)

Simple retry options for infrastructure-level retry logic.
Named InfraRetryOptions to avoid collision with utilities.ts RetryOptions and
common.ts AsyncRetryOptions.

## Properties

### maxRetries

> **maxRetries**: `number`

Defined in: [types/common.ts:325](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L325)

---

### baseDelayMs

> **baseDelayMs**: `number`

Defined in: [types/common.ts:326](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L326)

---

### maxDelayMs?

> `optional` **maxDelayMs?**: `number`

Defined in: [types/common.ts:327](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L327)

---

### shouldRetry?

> `optional` **shouldRetry?**: (`error`) => `boolean`

Defined in: [types/common.ts:328](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L328)

#### Parameters

##### error

`Error`

#### Returns

`boolean`
