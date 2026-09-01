[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerErrorInfo

# Type Alias: SageMakerErrorInfo

> **SageMakerErrorInfo** = `object`

Defined in: [types/providers.ts:1742](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1742)

SageMaker-specific error information

## Properties

### code

> **code**: [`SageMakerErrorCode`](SageMakerErrorCode.md)

Defined in: [types/providers.ts:1744](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1744)

Error code

---

### message

> **message**: `string`

Defined in: [types/providers.ts:1746](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1746)

Human-readable error message

---

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [types/providers.ts:1748](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1748)

HTTP status code if applicable

---

### cause?

> `optional` **cause?**: `Error`

Defined in: [types/providers.ts:1750](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1750)

Original error from AWS SDK

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1752](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1752)

Endpoint name where error occurred

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/providers.ts:1754](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1754)

Request ID for debugging

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/providers.ts:1756](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1756)

Retry suggestion
