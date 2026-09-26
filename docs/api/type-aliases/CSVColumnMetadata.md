[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVColumnMetadata

# Type Alias: CSVColumnMetadata

> **CSVColumnMetadata** = `object`

Defined in: [types/file.ts:422](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L422)

Rich metadata for a single CSV column

## Properties

### name

> **name**: `string`

Defined in: [types/file.ts:423](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L423)

---

### originalName?

> `optional` **originalName?**: `string`

Defined in: [types/file.ts:425](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L425)

Original header text before sanitization, when sanitizeColumnNames rewrote it (#378)

---

### index

> **index**: `number`

Defined in: [types/file.ts:426](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L426)

---

### detectedType

> **detectedType**: [`CSVColumnDataType`](CSVColumnDataType.md)

Defined in: [types/file.ts:427](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L427)

---

### typeConfidence

> **typeConfidence**: `number`

Defined in: [types/file.ts:429](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L429)

Confidence of type detection (0-100)

---

### nullCount

> **nullCount**: `number`

Defined in: [types/file.ts:431](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L431)

Count of null/empty values

---

### uniqueCount

> **uniqueCount**: `number`

Defined in: [types/file.ts:433](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L433)

Count of unique values

---

### sampleValues

> **sampleValues**: `string`[]

Defined in: [types/file.ts:435](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L435)

Sample values from this column (up to 5)

---

### minValue?

> `optional` **minValue?**: `number`

Defined in: [types/file.ts:437](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L437)

For numeric columns: min value

---

### maxValue?

> `optional` **maxValue?**: `number`

Defined in: [types/file.ts:439](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L439)

For numeric columns: max value

---

### avgValue?

> `optional` **avgValue?**: `number`

Defined in: [types/file.ts:441](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L441)

For numeric columns: average value

---

### dateFormat?

> `optional` **dateFormat?**: `string`

Defined in: [types/file.ts:443](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L443)

For date columns: detected format (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY')

---

### nameIssues?

> `optional` **nameIssues?**: `string`[]

Defined in: [types/file.ts:445](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L445)

Column name validation issues
