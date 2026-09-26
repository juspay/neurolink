[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerErrorInfo

# Type Alias: SageMakerErrorInfo

> **SageMakerErrorInfo** = `object`

Defined in: [types/providers.ts:1786](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1786)

SageMaker-specific error information

## Properties

### code

> **code**: [`SageMakerErrorCode`](SageMakerErrorCode.md)

Defined in: [types/providers.ts:1788](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1788)

Error code

---

### message

> **message**: `string`

Defined in: [types/providers.ts:1790](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1790)

Human-readable error message

---

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [types/providers.ts:1792](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1792)

HTTP status code if applicable

---

### cause?

> `optional` **cause?**: `Error`

Defined in: [types/providers.ts:1794](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1794)

Original error from AWS SDK

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1796](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1796)

Endpoint name where error occurred

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/providers.ts:1798](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1798)

Request ID for debugging

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/providers.ts:1800](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1800)

Retry suggestion
