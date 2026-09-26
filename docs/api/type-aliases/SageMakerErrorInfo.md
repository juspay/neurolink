[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerErrorInfo

# Type Alias: SageMakerErrorInfo

> **SageMakerErrorInfo** = `object`

Defined in: [types/providers.ts:1807](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1807)

SageMaker-specific error information

## Properties

### code

> **code**: [`SageMakerErrorCode`](SageMakerErrorCode.md)

Defined in: [types/providers.ts:1809](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1809)

Error code

---

### message

> **message**: `string`

Defined in: [types/providers.ts:1811](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1811)

Human-readable error message

---

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [types/providers.ts:1813](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1813)

HTTP status code if applicable

---

### cause?

> `optional` **cause?**: `Error`

Defined in: [types/providers.ts:1815](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1815)

Original error from AWS SDK

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1817](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1817)

Endpoint name where error occurred

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/providers.ts:1819](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1819)

Request ID for debugging

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/providers.ts:1821](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1821)

Retry suggestion
