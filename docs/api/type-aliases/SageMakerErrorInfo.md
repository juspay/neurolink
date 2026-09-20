[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerErrorInfo

# Type Alias: SageMakerErrorInfo

> **SageMakerErrorInfo** = `object`

Defined in: [types/providers.ts:1778](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1778)

SageMaker-specific error information

## Properties

### code

> **code**: [`SageMakerErrorCode`](SageMakerErrorCode.md)

Defined in: [types/providers.ts:1780](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1780)

Error code

---

### message

> **message**: `string`

Defined in: [types/providers.ts:1782](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1782)

Human-readable error message

---

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [types/providers.ts:1784](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1784)

HTTP status code if applicable

---

### cause?

> `optional` **cause?**: `Error`

Defined in: [types/providers.ts:1786](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1786)

Original error from AWS SDK

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1788](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1788)

Endpoint name where error occurred

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/providers.ts:1790](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1790)

Request ID for debugging

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/providers.ts:1792](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1792)

Retry suggestion
