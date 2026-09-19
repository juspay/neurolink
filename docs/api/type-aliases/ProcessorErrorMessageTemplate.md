[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorErrorMessageTemplate

# Type Alias: ProcessorErrorMessageTemplate

> **ProcessorErrorMessageTemplate** = `object`

Defined in: [types/processor.ts:1036](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1036)

Error message template with user-friendly messaging and retry information.

## Properties

### message

> **message**: `string`

Defined in: [types/processor.ts:1038](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1038)

Technical error message

---

### userMessage

> **userMessage**: `string`

Defined in: [types/processor.ts:1040](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1040)

User-friendly error message

---

### suggestedAction

> **suggestedAction**: `string`

Defined in: [types/processor.ts:1042](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1042)

Suggested action to resolve the error

---

### retryable

> **retryable**: `boolean`

Defined in: [types/processor.ts:1044](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1044)

Whether this error is potentially retryable
