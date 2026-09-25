[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileProcessingSummary

# Type Alias: FileProcessingSummary

> **FileProcessingSummary** = `object`

Defined in: [types/processor.ts:1175](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1175)

Summary of file processing operations.

## Properties

### totalFiles

> **totalFiles**: `number`

Defined in: [types/processor.ts:1176](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1176)

---

### processedFiles

> **processedFiles**: `object`[]

Defined in: [types/processor.ts:1177](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1177)

#### filename

> **filename**: `string`

#### size?

> `optional` **size?**: `number`

#### type?

> `optional` **type?**: `string`

---

### failedFiles

> **failedFiles**: `object`[]

Defined in: [types/processor.ts:1182](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1182)

#### filename

> **filename**: `string`

#### error

> **error**: [`FileProcessingError`](FileProcessingError.md)

---

### skippedFiles

> **skippedFiles**: `object`[]

Defined in: [types/processor.ts:1186](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1186)

#### filename

> **filename**: `string`

#### reason

> **reason**: `string`

#### suggestedAlternative?

> `optional` **suggestedAlternative?**: `string`

---

### warnings

> **warnings**: `object`[]

Defined in: [types/processor.ts:1191](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1191)

#### filename

> **filename**: `string`

#### message

> **message**: `string`
