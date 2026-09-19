[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVColumnMetadata

# Type Alias: CSVColumnMetadata

> **CSVColumnMetadata** = `object`

Defined in: [types/file.ts:300](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L300)

Rich metadata for a single CSV column

## Properties

### name

> **name**: `string`

Defined in: [types/file.ts:301](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L301)

---

### originalName?

> `optional` **originalName?**: `string`

Defined in: [types/file.ts:303](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L303)

Original header text before sanitization, when sanitizeColumnNames rewrote it (#378)

---

### index

> **index**: `number`

Defined in: [types/file.ts:304](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L304)

---

### detectedType

> **detectedType**: [`CSVColumnDataType`](CSVColumnDataType.md)

Defined in: [types/file.ts:305](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L305)

---

### typeConfidence

> **typeConfidence**: `number`

Defined in: [types/file.ts:307](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L307)

Confidence of type detection (0-100)

---

### nullCount

> **nullCount**: `number`

Defined in: [types/file.ts:309](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L309)

Count of null/empty values

---

### uniqueCount

> **uniqueCount**: `number`

Defined in: [types/file.ts:311](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L311)

Count of unique values

---

### sampleValues

> **sampleValues**: `string`[]

Defined in: [types/file.ts:313](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L313)

Sample values from this column (up to 5)

---

### minValue?

> `optional` **minValue?**: `number`

Defined in: [types/file.ts:315](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L315)

For numeric columns: min value

---

### maxValue?

> `optional` **maxValue?**: `number`

Defined in: [types/file.ts:317](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L317)

For numeric columns: max value

---

### avgValue?

> `optional` **avgValue?**: `number`

Defined in: [types/file.ts:319](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L319)

For numeric columns: average value

---

### dateFormat?

> `optional` **dateFormat?**: `string`

Defined in: [types/file.ts:321](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L321)

For date columns: detected format (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY')

---

### nameIssues?

> `optional` **nameIssues?**: `string`[]

Defined in: [types/file.ts:323](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L323)

Column name validation issues
