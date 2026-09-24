[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerErrorInfo

# Type Alias: SageMakerErrorInfo

> **SageMakerErrorInfo** = `object`

Defined in: [types/providers.ts:1798](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1798)

SageMaker-specific error information

## Properties

### code

> **code**: [`SageMakerErrorCode`](SageMakerErrorCode.md)

Defined in: [types/providers.ts:1800](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1800)

Error code

---

### message

> **message**: `string`

Defined in: [types/providers.ts:1802](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1802)

Human-readable error message

---

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [types/providers.ts:1804](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1804)

HTTP status code if applicable

---

### cause?

> `optional` **cause?**: `Error`

Defined in: [types/providers.ts:1806](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1806)

Original error from AWS SDK

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1808](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1808)

Endpoint name where error occurred

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/providers.ts:1810](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1810)

Request ID for debugging

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/providers.ts:1812](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1812)

Retry suggestion
