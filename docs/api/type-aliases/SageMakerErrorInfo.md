[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerErrorInfo

# Type Alias: SageMakerErrorInfo

> **SageMakerErrorInfo** = `object`

Defined in: [types/providers.ts:1748](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1748)

SageMaker-specific error information

## Properties

### code

> **code**: [`SageMakerErrorCode`](SageMakerErrorCode.md)

Defined in: [types/providers.ts:1750](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1750)

Error code

---

### message

> **message**: `string`

Defined in: [types/providers.ts:1752](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1752)

Human-readable error message

---

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [types/providers.ts:1754](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1754)

HTTP status code if applicable

---

### cause?

> `optional` **cause?**: `Error`

Defined in: [types/providers.ts:1756](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1756)

Original error from AWS SDK

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1758](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1758)

Endpoint name where error occurred

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/providers.ts:1760](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1760)

Request ID for debugging

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/providers.ts:1762](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1762)

Retry suggestion
