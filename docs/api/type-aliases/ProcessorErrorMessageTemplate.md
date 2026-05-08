[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessorErrorMessageTemplate

# Type Alias: ProcessorErrorMessageTemplate

> **ProcessorErrorMessageTemplate** = `object`

Defined in: [types/processor.ts:969](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L969)

Error message template with user-friendly messaging and retry information.

## Properties

### message

> **message**: `string`

Defined in: [types/processor.ts:971](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L971)

Technical error message

---

### userMessage

> **userMessage**: `string`

Defined in: [types/processor.ts:973](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L973)

User-friendly error message

---

### suggestedAction

> **suggestedAction**: `string`

Defined in: [types/processor.ts:975](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L975)

Suggested action to resolve the error

---

### retryable

> **retryable**: `boolean`

Defined in: [types/processor.ts:977](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L977)

Whether this error is potentially retryable
