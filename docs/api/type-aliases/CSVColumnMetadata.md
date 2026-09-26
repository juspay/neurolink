[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVColumnMetadata

# Type Alias: CSVColumnMetadata

> **CSVColumnMetadata** = `object`

Defined in: [types/file.ts:450](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L450)

Rich metadata for a single CSV column

## Properties

### name

> **name**: `string`

Defined in: [types/file.ts:451](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L451)

---

### originalName?

> `optional` **originalName?**: `string`

Defined in: [types/file.ts:453](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L453)

Original header text before sanitization, when sanitizeColumnNames rewrote it (#378)

---

### index

> **index**: `number`

Defined in: [types/file.ts:454](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L454)

---

### detectedType

> **detectedType**: [`CSVColumnDataType`](CSVColumnDataType.md)

Defined in: [types/file.ts:455](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L455)

---

### typeConfidence

> **typeConfidence**: `number`

Defined in: [types/file.ts:457](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L457)

Confidence of type detection (0-100)

---

### nullCount

> **nullCount**: `number`

Defined in: [types/file.ts:459](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L459)

Count of null/empty values

---

### uniqueCount

> **uniqueCount**: `number`

Defined in: [types/file.ts:461](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L461)

Count of unique values

---

### sampleValues

> **sampleValues**: `string`[]

Defined in: [types/file.ts:463](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L463)

Sample values from this column (up to 5)

---

### minValue?

> `optional` **minValue?**: `number`

Defined in: [types/file.ts:465](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L465)

For numeric columns: min value

---

### maxValue?

> `optional` **maxValue?**: `number`

Defined in: [types/file.ts:467](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L467)

For numeric columns: max value

---

### avgValue?

> `optional` **avgValue?**: `number`

Defined in: [types/file.ts:469](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L469)

For numeric columns: average value

---

### dateFormat?

> `optional` **dateFormat?**: `string`

Defined in: [types/file.ts:471](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L471)

For date columns: detected format (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY')

---

### nameIssues?

> `optional` **nameIssues?**: `string`[]

Defined in: [types/file.ts:473](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L473)

Column name validation issues
