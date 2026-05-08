[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileProcessingSummary

# Type Alias: FileProcessingSummary

> **FileProcessingSummary** = `object`

Defined in: [types/processor.ts:1075](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1075)

Summary of file processing operations.

## Properties

### totalFiles

> **totalFiles**: `number`

Defined in: [types/processor.ts:1076](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1076)

---

### processedFiles

> **processedFiles**: `object`[]

Defined in: [types/processor.ts:1077](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1077)

#### filename

> **filename**: `string`

#### size?

> `optional` **size?**: `number`

#### type?

> `optional` **type?**: `string`

---

### failedFiles

> **failedFiles**: `object`[]

Defined in: [types/processor.ts:1082](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1082)

#### filename

> **filename**: `string`

#### error

> **error**: [`FileProcessingError`](FileProcessingError.md)

---

### skippedFiles

> **skippedFiles**: `object`[]

Defined in: [types/processor.ts:1086](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1086)

#### filename

> **filename**: `string`

#### reason

> **reason**: `string`

#### suggestedAlternative?

> `optional` **suggestedAlternative?**: `string`

---

### warnings

> **warnings**: `object`[]

Defined in: [types/processor.ts:1091](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1091)

#### filename

> **filename**: `string`

#### message

> **message**: `string`
