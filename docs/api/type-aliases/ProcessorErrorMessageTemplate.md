[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorErrorMessageTemplate

# Type Alias: ProcessorErrorMessageTemplate

> **ProcessorErrorMessageTemplate** = `object`

Defined in: [types/processor.ts:1041](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1041)

Error message template with user-friendly messaging and retry information.

## Properties

### message

> **message**: `string`

Defined in: [types/processor.ts:1043](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1043)

Technical error message

---

### userMessage

> **userMessage**: `string`

Defined in: [types/processor.ts:1045](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1045)

User-friendly error message

---

### suggestedAction

> **suggestedAction**: `string`

Defined in: [types/processor.ts:1047](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1047)

Suggested action to resolve the error

---

### retryable

> **retryable**: `boolean`

Defined in: [types/processor.ts:1049](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1049)

Whether this error is potentially retryable
