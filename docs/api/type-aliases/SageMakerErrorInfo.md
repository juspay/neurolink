[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerErrorInfo

# Type Alias: SageMakerErrorInfo

> **SageMakerErrorInfo** = `object`

Defined in: [types/providers.ts:1707](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1707)

SageMaker-specific error information

## Properties

### code

> **code**: [`SageMakerErrorCode`](SageMakerErrorCode.md)

Defined in: [types/providers.ts:1709](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1709)

Error code

---

### message

> **message**: `string`

Defined in: [types/providers.ts:1711](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1711)

Human-readable error message

---

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [types/providers.ts:1713](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1713)

HTTP status code if applicable

---

### cause?

> `optional` **cause?**: `Error`

Defined in: [types/providers.ts:1715](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1715)

Original error from AWS SDK

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1717](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1717)

Endpoint name where error occurred

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/providers.ts:1719](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1719)

Request ID for debugging

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/providers.ts:1721](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1721)

Retry suggestion
