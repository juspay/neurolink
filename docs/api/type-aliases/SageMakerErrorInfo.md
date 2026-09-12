[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerErrorInfo

# Type Alias: SageMakerErrorInfo

> **SageMakerErrorInfo** = `object`

Defined in: [types/providers.ts:1720](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1720)

SageMaker-specific error information

## Properties

### code

> **code**: [`SageMakerErrorCode`](SageMakerErrorCode.md)

Defined in: [types/providers.ts:1722](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1722)

Error code

---

### message

> **message**: `string`

Defined in: [types/providers.ts:1724](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1724)

Human-readable error message

---

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [types/providers.ts:1726](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1726)

HTTP status code if applicable

---

### cause?

> `optional` **cause?**: `Error`

Defined in: [types/providers.ts:1728](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1728)

Original error from AWS SDK

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1730](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1730)

Endpoint name where error occurred

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/providers.ts:1732](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1732)

Request ID for debugging

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/providers.ts:1734](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1734)

Retry suggestion
