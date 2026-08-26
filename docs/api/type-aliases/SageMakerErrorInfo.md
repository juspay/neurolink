[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerErrorInfo

# Type Alias: SageMakerErrorInfo

> **SageMakerErrorInfo** = `object`

Defined in: [types/providers.ts:1704](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1704)

SageMaker-specific error information

## Properties

### code

> **code**: [`SageMakerErrorCode`](SageMakerErrorCode.md)

Defined in: [types/providers.ts:1706](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1706)

Error code

---

### message

> **message**: `string`

Defined in: [types/providers.ts:1708](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1708)

Human-readable error message

---

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [types/providers.ts:1710](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1710)

HTTP status code if applicable

---

### cause?

> `optional` **cause?**: `Error`

Defined in: [types/providers.ts:1712](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1712)

Original error from AWS SDK

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1714](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1714)

Endpoint name where error occurred

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/providers.ts:1716](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1716)

Request ID for debugging

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/providers.ts:1718](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1718)

Retry suggestion
