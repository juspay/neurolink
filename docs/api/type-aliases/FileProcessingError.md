[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileProcessingError

# Type Alias: FileProcessingError

> **FileProcessingError** = `object`

Structured file processing error with user-friendly messaging.
This is the canonical error type used across all processor infrastructure.

## Properties

### code

> **code**: [`FileErrorCode`](../enumerations/FileErrorCode.md) \| `string`

Error code from FileErrorCode enum

---

### message

> **message**: `string`

Technical error message

---

### userMessage

> **userMessage**: `string`

User-friendly error message

---

### suggestedAction?

> `optional` **suggestedAction?**: `string`

Suggested action to resolve the error

---

### retryable?

> `optional` **retryable?**: `boolean`

Whether this error is potentially retryable

---

### details?

> `optional` **details?**: `Record`\<`string`, `unknown`\>

Additional context/details about the error

---

### technicalDetails?

> `optional` **technicalDetails?**: `string`

Technical details (usually from original error)

---

### originalError?

> `optional` **originalError?**: `Error`

Original error that caused this failure
