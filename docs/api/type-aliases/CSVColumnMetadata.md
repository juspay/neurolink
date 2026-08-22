[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVColumnMetadata

# Type Alias: CSVColumnMetadata

> **CSVColumnMetadata** = `object`

Defined in: [types/file.ts:262](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L262)

Rich metadata for a single CSV column

## Properties

### name

> **name**: `string`

Defined in: [types/file.ts:263](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L263)

---

### originalName?

> `optional` **originalName?**: `string`

Defined in: [types/file.ts:265](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L265)

Original header text before sanitization, when sanitizeColumnNames rewrote it (#378)

---

### index

> **index**: `number`

Defined in: [types/file.ts:266](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L266)

---

### detectedType

> **detectedType**: [`CSVColumnDataType`](CSVColumnDataType.md)

Defined in: [types/file.ts:267](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L267)

---

### typeConfidence

> **typeConfidence**: `number`

Defined in: [types/file.ts:269](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L269)

Confidence of type detection (0-100)

---

### nullCount

> **nullCount**: `number`

Defined in: [types/file.ts:271](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L271)

Count of null/empty values

---

### uniqueCount

> **uniqueCount**: `number`

Defined in: [types/file.ts:273](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L273)

Count of unique values

---

### sampleValues

> **sampleValues**: `string`[]

Defined in: [types/file.ts:275](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L275)

Sample values from this column (up to 5)

---

### minValue?

> `optional` **minValue?**: `number`

Defined in: [types/file.ts:277](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L277)

For numeric columns: min value

---

### maxValue?

> `optional` **maxValue?**: `number`

Defined in: [types/file.ts:279](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L279)

For numeric columns: max value

---

### avgValue?

> `optional` **avgValue?**: `number`

Defined in: [types/file.ts:281](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L281)

For numeric columns: average value

---

### dateFormat?

> `optional` **dateFormat?**: `string`

Defined in: [types/file.ts:283](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L283)

For date columns: detected format (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY')

---

### nameIssues?

> `optional` **nameIssues?**: `string`[]

Defined in: [types/file.ts:285](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L285)

Column name validation issues
