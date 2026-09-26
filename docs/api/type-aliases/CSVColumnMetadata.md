[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVColumnMetadata

# Type Alias: CSVColumnMetadata

> **CSVColumnMetadata** = `object`

Defined in: [types/file.ts:380](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L380)

Rich metadata for a single CSV column

## Properties

### name

> **name**: `string`

Defined in: [types/file.ts:381](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L381)

---

### originalName?

> `optional` **originalName?**: `string`

Defined in: [types/file.ts:383](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L383)

Original header text before sanitization, when sanitizeColumnNames rewrote it (#378)

---

### index

> **index**: `number`

Defined in: [types/file.ts:384](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L384)

---

### detectedType

> **detectedType**: [`CSVColumnDataType`](CSVColumnDataType.md)

Defined in: [types/file.ts:385](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L385)

---

### typeConfidence

> **typeConfidence**: `number`

Defined in: [types/file.ts:387](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L387)

Confidence of type detection (0-100)

---

### nullCount

> **nullCount**: `number`

Defined in: [types/file.ts:389](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L389)

Count of null/empty values

---

### uniqueCount

> **uniqueCount**: `number`

Defined in: [types/file.ts:391](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L391)

Count of unique values

---

### sampleValues

> **sampleValues**: `string`[]

Defined in: [types/file.ts:393](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L393)

Sample values from this column (up to 5)

---

### minValue?

> `optional` **minValue?**: `number`

Defined in: [types/file.ts:395](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L395)

For numeric columns: min value

---

### maxValue?

> `optional` **maxValue?**: `number`

Defined in: [types/file.ts:397](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L397)

For numeric columns: max value

---

### avgValue?

> `optional` **avgValue?**: `number`

Defined in: [types/file.ts:399](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L399)

For numeric columns: average value

---

### dateFormat?

> `optional` **dateFormat?**: `string`

Defined in: [types/file.ts:401](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L401)

For date columns: detected format (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY')

---

### nameIssues?

> `optional` **nameIssues?**: `string`[]

Defined in: [types/file.ts:403](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L403)

Column name validation issues
