[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerErrorInfo

# Type Alias: SageMakerErrorInfo

> **SageMakerErrorInfo** = `object`

Defined in: [types/providers.ts:1725](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1725)

SageMaker-specific error information

## Properties

### code

> **code**: [`SageMakerErrorCode`](SageMakerErrorCode.md)

Defined in: [types/providers.ts:1727](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1727)

Error code

---

### message

> **message**: `string`

Defined in: [types/providers.ts:1729](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1729)

Human-readable error message

---

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [types/providers.ts:1731](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1731)

HTTP status code if applicable

---

### cause?

> `optional` **cause?**: `Error`

Defined in: [types/providers.ts:1733](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1733)

Original error from AWS SDK

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1735](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1735)

Endpoint name where error occurred

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/providers.ts:1737](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1737)

Request ID for debugging

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/providers.ts:1739](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1739)

Retry suggestion
