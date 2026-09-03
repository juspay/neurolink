[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerErrorInfo

# Type Alias: SageMakerErrorInfo

> **SageMakerErrorInfo** = `object`

Defined in: [types/providers.ts:1735](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1735)

SageMaker-specific error information

## Properties

### code

> **code**: [`SageMakerErrorCode`](SageMakerErrorCode.md)

Defined in: [types/providers.ts:1737](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1737)

Error code

---

### message

> **message**: `string`

Defined in: [types/providers.ts:1739](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1739)

Human-readable error message

---

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [types/providers.ts:1741](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1741)

HTTP status code if applicable

---

### cause?

> `optional` **cause?**: `Error`

Defined in: [types/providers.ts:1743](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1743)

Original error from AWS SDK

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1745](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1745)

Endpoint name where error occurred

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/providers.ts:1747](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1747)

Request ID for debugging

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/providers.ts:1749](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1749)

Retry suggestion
