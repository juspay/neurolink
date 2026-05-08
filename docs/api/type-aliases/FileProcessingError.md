[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileProcessingError

# Type Alias: FileProcessingError

> **FileProcessingError** = `object`

Defined in: [types/processor.ts:98](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L98)

Structured file processing error with user-friendly messaging.
This is the canonical error type used across all processor infrastructure.

## Properties

### code

> **code**: [`FileErrorCode`](../enumerations/FileErrorCode.md) \| `string`

Defined in: [types/processor.ts:100](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L100)

Error code from FileErrorCode enum

---

### message

> **message**: `string`

Defined in: [types/processor.ts:102](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L102)

Technical error message

---

### userMessage

> **userMessage**: `string`

Defined in: [types/processor.ts:104](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L104)

User-friendly error message

---

### suggestedAction?

> `optional` **suggestedAction?**: `string`

Defined in: [types/processor.ts:106](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L106)

Suggested action to resolve the error

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/processor.ts:108](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L108)

Whether this error is potentially retryable

---

### details?

> `optional` **details?**: `Record`\<`string`, `unknown`\>

Defined in: [types/processor.ts:110](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L110)

Additional context/details about the error

---

### technicalDetails?

> `optional` **technicalDetails?**: `string`

Defined in: [types/processor.ts:112](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L112)

Technical details (usually from original error)

---

### originalError?

> `optional` **originalError?**: `Error`

Defined in: [types/processor.ts:114](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L114)

Original error that caused this failure
