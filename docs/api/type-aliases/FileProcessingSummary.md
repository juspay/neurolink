[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileProcessingSummary

# Type Alias: FileProcessingSummary

> **FileProcessingSummary** = `object`

Defined in: [types/processor.ts:1142](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1142)

Summary of file processing operations.

## Properties

### totalFiles

> **totalFiles**: `number`

Defined in: [types/processor.ts:1143](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1143)

---

### processedFiles

> **processedFiles**: `object`[]

Defined in: [types/processor.ts:1144](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1144)

#### filename

> **filename**: `string`

#### size?

> `optional` **size?**: `number`

#### type?

> `optional` **type?**: `string`

---

### failedFiles

> **failedFiles**: `object`[]

Defined in: [types/processor.ts:1149](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1149)

#### filename

> **filename**: `string`

#### error

> **error**: [`FileProcessingError`](FileProcessingError.md)

---

### skippedFiles

> **skippedFiles**: `object`[]

Defined in: [types/processor.ts:1153](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1153)

#### filename

> **filename**: `string`

#### reason

> **reason**: `string`

#### suggestedAlternative?

> `optional` **suggestedAlternative?**: `string`

---

### warnings

> **warnings**: `object`[]

Defined in: [types/processor.ts:1158](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1158)

#### filename

> **filename**: `string`

#### message

> **message**: `string`
