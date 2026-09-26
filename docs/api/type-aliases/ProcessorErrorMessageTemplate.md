[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorErrorMessageTemplate

# Type Alias: ProcessorErrorMessageTemplate

> **ProcessorErrorMessageTemplate** = `object`

Error message template with user-friendly messaging and retry information.

## Properties

### message

> **message**: `string`

Technical error message

---

### userMessage

> **userMessage**: `string`

User-friendly error message

---

### suggestedAction

> **suggestedAction**: `string`

Suggested action to resolve the error

---

### retryable

> **retryable**: `boolean`

Whether this error is potentially retryable
