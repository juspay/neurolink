[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVColumnMetadata

# Type Alias: CSVColumnMetadata

> **CSVColumnMetadata** = `object`

Defined in: [types/file.ts:273](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L273)

Rich metadata for a single CSV column

## Properties

### name

> **name**: `string`

Defined in: [types/file.ts:274](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L274)

---

### originalName?

> `optional` **originalName?**: `string`

Defined in: [types/file.ts:276](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L276)

Original header text before sanitization, when sanitizeColumnNames rewrote it (#378)

---

### index

> **index**: `number`

Defined in: [types/file.ts:277](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L277)

---

### detectedType

> **detectedType**: [`CSVColumnDataType`](CSVColumnDataType.md)

Defined in: [types/file.ts:278](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L278)

---

### typeConfidence

> **typeConfidence**: `number`

Defined in: [types/file.ts:280](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L280)

Confidence of type detection (0-100)

---

### nullCount

> **nullCount**: `number`

Defined in: [types/file.ts:282](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L282)

Count of null/empty values

---

### uniqueCount

> **uniqueCount**: `number`

Defined in: [types/file.ts:284](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L284)

Count of unique values

---

### sampleValues

> **sampleValues**: `string`[]

Defined in: [types/file.ts:286](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L286)

Sample values from this column (up to 5)

---

### minValue?

> `optional` **minValue?**: `number`

Defined in: [types/file.ts:288](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L288)

For numeric columns: min value

---

### maxValue?

> `optional` **maxValue?**: `number`

Defined in: [types/file.ts:290](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L290)

For numeric columns: max value

---

### avgValue?

> `optional` **avgValue?**: `number`

Defined in: [types/file.ts:292](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L292)

For numeric columns: average value

---

### dateFormat?

> `optional` **dateFormat?**: `string`

Defined in: [types/file.ts:294](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L294)

For date columns: detected format (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY')

---

### nameIssues?

> `optional` **nameIssues?**: `string`[]

Defined in: [types/file.ts:296](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L296)

Column name validation issues
