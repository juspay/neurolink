[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileProcessingSummary

# Type Alias: FileProcessingSummary

> **FileProcessingSummary** = `object`

Defined in: [types/processor.ts:1150](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1150)

Summary of file processing operations.

## Properties

### totalFiles

> **totalFiles**: `number`

Defined in: [types/processor.ts:1151](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1151)

---

### processedFiles

> **processedFiles**: `object`[]

Defined in: [types/processor.ts:1152](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1152)

#### filename

> **filename**: `string`

#### size?

> `optional` **size?**: `number`

#### type?

> `optional` **type?**: `string`

---

### failedFiles

> **failedFiles**: `object`[]

Defined in: [types/processor.ts:1157](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1157)

#### filename

> **filename**: `string`

#### error

> **error**: [`FileProcessingError`](FileProcessingError.md)

---

### skippedFiles

> **skippedFiles**: `object`[]

Defined in: [types/processor.ts:1161](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1161)

#### filename

> **filename**: `string`

#### reason

> **reason**: `string`

#### suggestedAlternative?

> `optional` **suggestedAlternative?**: `string`

---

### warnings

> **warnings**: `object`[]

Defined in: [types/processor.ts:1166](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1166)

#### filename

> **filename**: `string`

#### message

> **message**: `string`
