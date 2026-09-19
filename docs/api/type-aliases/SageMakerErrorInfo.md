[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerErrorInfo

# Type Alias: SageMakerErrorInfo

> **SageMakerErrorInfo** = `object`

Defined in: [types/providers.ts:1779](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1779)

SageMaker-specific error information

## Properties

### code

> **code**: [`SageMakerErrorCode`](SageMakerErrorCode.md)

Defined in: [types/providers.ts:1781](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1781)

Error code

---

### message

> **message**: `string`

Defined in: [types/providers.ts:1783](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1783)

Human-readable error message

---

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [types/providers.ts:1785](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1785)

HTTP status code if applicable

---

### cause?

> `optional` **cause?**: `Error`

Defined in: [types/providers.ts:1787](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1787)

Original error from AWS SDK

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1789](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1789)

Endpoint name where error occurred

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/providers.ts:1791](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1791)

Request ID for debugging

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/providers.ts:1793](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1793)

Retry suggestion
