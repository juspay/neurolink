[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorErrorMessageTemplate

# Type Alias: ProcessorErrorMessageTemplate

> **ProcessorErrorMessageTemplate** = `object`

Defined in: [types/processor.ts:1069](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1069)

Error message template with user-friendly messaging and retry information.

## Properties

### message

> **message**: `string`

Defined in: [types/processor.ts:1071](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1071)

Technical error message

---

### userMessage

> **userMessage**: `string`

Defined in: [types/processor.ts:1073](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1073)

User-friendly error message

---

### suggestedAction

> **suggestedAction**: `string`

Defined in: [types/processor.ts:1075](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1075)

Suggested action to resolve the error

---

### retryable

> **retryable**: `boolean`

Defined in: [types/processor.ts:1077](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1077)

Whether this error is potentially retryable
