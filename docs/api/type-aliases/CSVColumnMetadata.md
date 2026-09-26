[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVColumnMetadata

# Type Alias: CSVColumnMetadata

> **CSVColumnMetadata** = `object`

Defined in: [types/file.ts:389](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L389)

Rich metadata for a single CSV column

## Properties

### name

> **name**: `string`

Defined in: [types/file.ts:390](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L390)

---

### originalName?

> `optional` **originalName?**: `string`

Defined in: [types/file.ts:392](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L392)

Original header text before sanitization, when sanitizeColumnNames rewrote it (#378)

---

### index

> **index**: `number`

Defined in: [types/file.ts:393](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L393)

---

### detectedType

> **detectedType**: [`CSVColumnDataType`](CSVColumnDataType.md)

Defined in: [types/file.ts:394](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L394)

---

### typeConfidence

> **typeConfidence**: `number`

Defined in: [types/file.ts:396](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L396)

Confidence of type detection (0-100)

---

### nullCount

> **nullCount**: `number`

Defined in: [types/file.ts:398](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L398)

Count of null/empty values

---

### uniqueCount

> **uniqueCount**: `number`

Defined in: [types/file.ts:400](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L400)

Count of unique values

---

### sampleValues

> **sampleValues**: `string`[]

Defined in: [types/file.ts:402](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L402)

Sample values from this column (up to 5)

---

### minValue?

> `optional` **minValue?**: `number`

Defined in: [types/file.ts:404](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L404)

For numeric columns: min value

---

### maxValue?

> `optional` **maxValue?**: `number`

Defined in: [types/file.ts:406](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L406)

For numeric columns: max value

---

### avgValue?

> `optional` **avgValue?**: `number`

Defined in: [types/file.ts:408](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L408)

For numeric columns: average value

---

### dateFormat?

> `optional` **dateFormat?**: `string`

Defined in: [types/file.ts:410](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L410)

For date columns: detected format (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY')

---

### nameIssues?

> `optional` **nameIssues?**: `string`[]

Defined in: [types/file.ts:412](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L412)

Column name validation issues
