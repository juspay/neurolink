[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerErrorInfo

# Type Alias: SageMakerErrorInfo

> **SageMakerErrorInfo** = `object`

SageMaker-specific error information

## Properties

### code

> **code**: [`SageMakerErrorCode`](SageMakerErrorCode.md)

Error code

---

### message

> **message**: `string`

Human-readable error message

---

### statusCode?

> `optional` **statusCode?**: `number`

HTTP status code if applicable

---

### cause?

> `optional` **cause?**: `Error`

Original error from AWS SDK

---

### endpoint?

> `optional` **endpoint?**: `string`

Endpoint name where error occurred

---

### requestId?

> `optional` **requestId?**: `string`

Request ID for debugging

---

### retryable?

> `optional` **retryable?**: `boolean`

Retry suggestion
