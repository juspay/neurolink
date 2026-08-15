[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorErrorMessageTemplate

# Type Alias: ProcessorErrorMessageTemplate

> **ProcessorErrorMessageTemplate** = `object`

Defined in: [types/processor.ts:1025](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L1025)

Error message template with user-friendly messaging and retry information.

## Properties

### message

> **message**: `string`

Defined in: [types/processor.ts:1027](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L1027)

Technical error message

---

### userMessage

> **userMessage**: `string`

Defined in: [types/processor.ts:1029](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L1029)

User-friendly error message

---

### suggestedAction

> **suggestedAction**: `string`

Defined in: [types/processor.ts:1031](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L1031)

Suggested action to resolve the error

---

### retryable

> **retryable**: `boolean`

Defined in: [types/processor.ts:1033](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L1033)

Whether this error is potentially retryable
