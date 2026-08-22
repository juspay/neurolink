[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerErrorInfo

# Type Alias: SageMakerErrorInfo

> **SageMakerErrorInfo** = `object`

Defined in: [types/providers.ts:1703](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1703)

SageMaker-specific error information

## Properties

### code

> **code**: [`SageMakerErrorCode`](SageMakerErrorCode.md)

Defined in: [types/providers.ts:1705](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1705)

Error code

---

### message

> **message**: `string`

Defined in: [types/providers.ts:1707](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1707)

Human-readable error message

---

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [types/providers.ts:1709](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1709)

HTTP status code if applicable

---

### cause?

> `optional` **cause?**: `Error`

Defined in: [types/providers.ts:1711](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1711)

Original error from AWS SDK

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/providers.ts:1713](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1713)

Endpoint name where error occurred

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/providers.ts:1715](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1715)

Request ID for debugging

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/providers.ts:1717](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1717)

Retry suggestion
