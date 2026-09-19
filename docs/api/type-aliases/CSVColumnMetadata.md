[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVColumnMetadata

# Type Alias: CSVColumnMetadata

> **CSVColumnMetadata** = `object`

Defined in: [types/file.ts:290](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L290)

Rich metadata for a single CSV column

## Properties

### name

> **name**: `string`

Defined in: [types/file.ts:291](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L291)

---

### originalName?

> `optional` **originalName?**: `string`

Defined in: [types/file.ts:293](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L293)

Original header text before sanitization, when sanitizeColumnNames rewrote it (#378)

---

### index

> **index**: `number`

Defined in: [types/file.ts:294](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L294)

---

### detectedType

> **detectedType**: [`CSVColumnDataType`](CSVColumnDataType.md)

Defined in: [types/file.ts:295](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L295)

---

### typeConfidence

> **typeConfidence**: `number`

Defined in: [types/file.ts:297](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L297)

Confidence of type detection (0-100)

---

### nullCount

> **nullCount**: `number`

Defined in: [types/file.ts:299](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L299)

Count of null/empty values

---

### uniqueCount

> **uniqueCount**: `number`

Defined in: [types/file.ts:301](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L301)

Count of unique values

---

### sampleValues

> **sampleValues**: `string`[]

Defined in: [types/file.ts:303](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L303)

Sample values from this column (up to 5)

---

### minValue?

> `optional` **minValue?**: `number`

Defined in: [types/file.ts:305](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L305)

For numeric columns: min value

---

### maxValue?

> `optional` **maxValue?**: `number`

Defined in: [types/file.ts:307](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L307)

For numeric columns: max value

---

### avgValue?

> `optional` **avgValue?**: `number`

Defined in: [types/file.ts:309](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L309)

For numeric columns: average value

---

### dateFormat?

> `optional` **dateFormat?**: `string`

Defined in: [types/file.ts:311](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L311)

For date columns: detected format (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY')

---

### nameIssues?

> `optional` **nameIssues?**: `string`[]

Defined in: [types/file.ts:313](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L313)

Column name validation issues
