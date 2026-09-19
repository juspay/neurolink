[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVColumnMetadata

# Type Alias: CSVColumnMetadata

> **CSVColumnMetadata** = `object`

Defined in: [types/file.ts:360](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L360)

Rich metadata for a single CSV column

## Properties

### name

> **name**: `string`

Defined in: [types/file.ts:361](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L361)

---

### originalName?

> `optional` **originalName?**: `string`

Defined in: [types/file.ts:363](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L363)

Original header text before sanitization, when sanitizeColumnNames rewrote it (#378)

---

### index

> **index**: `number`

Defined in: [types/file.ts:364](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L364)

---

### detectedType

> **detectedType**: [`CSVColumnDataType`](CSVColumnDataType.md)

Defined in: [types/file.ts:365](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L365)

---

### typeConfidence

> **typeConfidence**: `number`

Defined in: [types/file.ts:367](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L367)

Confidence of type detection (0-100)

---

### nullCount

> **nullCount**: `number`

Defined in: [types/file.ts:369](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L369)

Count of null/empty values

---

### uniqueCount

> **uniqueCount**: `number`

Defined in: [types/file.ts:371](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L371)

Count of unique values

---

### sampleValues

> **sampleValues**: `string`[]

Defined in: [types/file.ts:373](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L373)

Sample values from this column (up to 5)

---

### minValue?

> `optional` **minValue?**: `number`

Defined in: [types/file.ts:375](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L375)

For numeric columns: min value

---

### maxValue?

> `optional` **maxValue?**: `number`

Defined in: [types/file.ts:377](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L377)

For numeric columns: max value

---

### avgValue?

> `optional` **avgValue?**: `number`

Defined in: [types/file.ts:379](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L379)

For numeric columns: average value

---

### dateFormat?

> `optional` **dateFormat?**: `string`

Defined in: [types/file.ts:381](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L381)

For date columns: detected format (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY')

---

### nameIssues?

> `optional` **nameIssues?**: `string`[]

Defined in: [types/file.ts:383](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L383)

Column name validation issues
